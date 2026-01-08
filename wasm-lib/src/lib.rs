use wasm_bindgen::prelude::*;
mod definitions; // Import definitions module
use serde::{Serialize, Deserialize};
use std::collections::{HashMap, HashSet};

// We need a way to represent the "Any" type from TS.
// SerdeValue can hold any JSON-serializable data.
use serde_json::Value as SerdeValue;

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct InputConnection {
    pub id: String,
    pub output_index: usize,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct OutputConnection {
    pub id: String,
    pub input_index: usize,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct Node {
    pub id: String,
    pub node_type: String,
    pub inputs: Vec<Vec<InputConnection>>,
    pub outputs: Vec<Vec<OutputConnection>>,
    pub data: Vec<SerdeValue>,
}

#[derive(Serialize)]
pub struct NodeCache {
    pub inputs: Vec<Option<SerdeValue>>,
    pub outputs: Vec<SerdeValue>,
}

#[wasm_bindgen]
pub struct GraphEngine {
    nodes: HashMap<String, Node>,
    cache: HashMap<String, SerdeValue>,
    node_registry: HashMap<String, definitions::NodeDefinition>, // Stores logic + schema
}

#[wasm_bindgen]
impl GraphEngine {
    #[wasm_bindgen(constructor)]
    pub fn new() -> GraphEngine {
        let registry = definitions::get_node_registry();
        GraphEngine {
            nodes: HashMap::new(),
            cache: HashMap::new(),
            node_registry: registry,
        }
    }

    pub fn get_node_defs(&self) -> Result<JsValue, JsValue> {
        // Extract just the schema part to send to JS
        let mut schemas = HashMap::new();
        for (key, def) in &self.node_registry {
            schemas.insert(key.clone(), def.schema.clone());
        }
        Ok(serde_wasm_bindgen::to_value(&schemas)?)
    }

    pub fn add_node(&mut self, id: String, node_type: String, data: JsValue) -> Result<(), JsValue> {
        let parsed_data: Vec<SerdeValue> = serde_wasm_bindgen::from_value(data)?;

        // Lookup node type in registry
        let def = self.node_registry.get(&node_type).ok_or_else(|| JsValue::from_str(&format!("Unknown node type: {}", node_type)))?;
        
        let input_count = def.schema.io.inputs.len();
        let output_count = def.schema.io.outputs.len();

        let node = Node {
            id: id.clone(),
            node_type,
            inputs: vec![Vec::new(); input_count],
            outputs: vec![Vec::new(); output_count],
            data: parsed_data,
        };

        self.nodes.insert(id, node);
        Ok(())
    }

    pub fn remove_node(&mut self, id: &str) -> Result<Vec<String>, JsValue> {
        if !self.nodes.contains_key(id) {
            return Err(JsValue::from_str(&format!("Node with ID {} not found.", id)));
        }

        let mut dirty_nodes = HashSet::new();

        if let Some(node) = self.nodes.get(id) {
            for output_socket in &node.outputs {
                for connection in output_socket {
                    dirty_nodes.insert(connection.id.clone());
                }
            }
        }

        // It is simpler to just replicate the TS logic:
        // iterate all neighbors, filter out connections to `id`.
        let id_string = id.to_string();

        let neighbors: Vec<String> = self.nodes.iter()
            .filter(|(_, n)| {
                 n.inputs.iter().any(|socket: &Vec<InputConnection>| socket.iter().any(|c| c.id == id_string)) ||
                 n.outputs.iter().any(|socket: &Vec<OutputConnection>| socket.iter().any(|c| c.id == id_string))
            })
            .map(|(k, _): (&String, &Node)| k.clone())
            .collect();

        for neighbor_id in neighbors {
             if let Some(node) = self.nodes.get_mut(&neighbor_id) {
                 // Remove from inputs
                 for socket in &mut node.inputs {
                     socket.retain(|c: &InputConnection| c.id != id_string);
                 }
                 // Remove from outputs
                 for socket in &mut node.outputs {
                     socket.retain(|c: &OutputConnection| c.id != id_string);
                 }
             }
        }

        // 3. Delete the node
        self.nodes.remove(id);

        Ok(dirty_nodes.into_iter().collect())
    }

    pub fn add_edge(&mut self, source_id: String, source_output_index: usize, target_id: String, target_input_index: usize) -> Result<Vec<String>, JsValue> {
        // Check availability
        if !self.nodes.contains_key(&source_id) || !self.nodes.contains_key(&target_id) {
             return Err(JsValue::from_str("Source or Target node not found"));
        }

        // Cycle detection?
        // Basic check: prevent self-loop
        if source_id == target_id {
            return Err(JsValue::from_str("Self-loops are not allowed."));
        }

        // 1. Update Source Node
        {
            let source_node = self.nodes.get_mut(&source_id).unwrap();
            if source_output_index >= source_node.outputs.len() {
                 return Err(JsValue::from_str("Invalid output index"));
            }
            source_node.outputs[source_output_index].push(OutputConnection {
                id: target_id.clone(),
                input_index: target_input_index
            });
        }

        // 2. Update Target Node
        {
            let target_node = self.nodes.get_mut(&target_id).unwrap();
            if target_input_index >= target_node.inputs.len() {
                 return Err(JsValue::from_str("Invalid input index"));
            }
            target_node.inputs[target_input_index].push(InputConnection {
                id: source_id, // Moved
                output_index: source_output_index
            });
        }

        let dirty = self.invalidate_cache_recursive(&target_id);
        Ok(dirty)
    }


    pub fn remove_edge(&mut self, source_id: String, source_output_index: usize, target_id: String, target_input_index: usize) -> Result<Vec<String>, JsValue> {
         if source_id == target_id {
             return Ok(Vec::new());
         }

        // Update Source
        if let Some(source_node) = self.nodes.get_mut(&source_id) {
             if source_output_index < source_node.outputs.len() {
                 source_node.outputs[source_output_index].retain(|c| !(c.id == target_id && c.input_index == target_input_index));
             }
        } else {
            return Err(JsValue::from_str("Source not found"));
        }

        // Update Target
        if let Some(target_node) = self.nodes.get_mut(&target_id) {
             if target_input_index < target_node.inputs.len() {
                 target_node.inputs[target_input_index].retain(|c| !(c.id == source_id && c.output_index == source_output_index));
             }
        } else {
             return Err(JsValue::from_str("Target not found"));
        }

        let dirty = self.invalidate_cache_recursive(&target_id);
        Ok(dirty)
    }


    pub fn update_node_data(&mut self, id: &str, data: JsValue) -> Result<Vec<String>, JsValue> {
        let parsed_data: Vec<SerdeValue> = serde_wasm_bindgen::from_value(data)?;
        let mut dirty = Vec::new();
        if let Some(node) = self.nodes.get_mut(id) {
            node.data = parsed_data;
            dirty = self.invalidate_cache_recursive(id);
        }
        Ok(dirty)
    }

    fn invalidate_cache_recursive(&mut self, id: &str) -> Vec<String> {
        let mut dirty_ids = Vec::new();
        if self.cache.remove(id).is_some() {
            dirty_ids.push(id.to_string());
        } else {
            // Even if not in cache, we should traverse? 
            // Actually if not in cache, dependents might be in cache?
            // Yes.
            dirty_ids.push(id.to_string());
        }
        
        let mut dependents = Vec::new();
        if let Some(node) = self.nodes.get(id) {
             for output_socket in &node.outputs {
                 for conn in output_socket {
                     dependents.push(conn.id.clone());
                 }
             }
        }
        
        for dep in dependents {
            let child_dirty = self.invalidate_cache_recursive(&dep);
            dirty_ids.extend(child_dirty);
        }
        
        dirty_ids
    }

    pub fn evaluate_node(&mut self, id: &str) -> Result<JsValue, JsValue> {
        // Ensure the target and all dependencies are computed and in cache
        self.eval_recursive(id)?;

        // Now build the full trace for all related nodes that have values in cache.
        // For simplicity/performance in this specific requested flow, we can just trace dependencies of `id`.
        let mut trace_map: HashMap<String, NodeCache> = HashMap::new();
        self.build_trace_recursive(id, &mut trace_map)?;
        
        Ok(serde_wasm_bindgen::to_value(&trace_map)?)
    }

    fn build_trace_recursive(&self, id: &str, map: &mut HashMap<String, NodeCache>) -> Result<(), JsValue> {
        if map.contains_key(id) {
            return Ok(());
        }

        let (node_type, _node_data, input_connections) = {
             let node = self.nodes.get(id).ok_or(JsValue::from_str(&format!("Node trace `{}` not found", id)))?;
             (node.node_type.clone(), node.data.clone(), node.inputs.clone())
        };

        // Inputs for this node
        let mut display_inputs: Vec<Option<SerdeValue>> = Vec::new();

        for socket in input_connections {
             let mut socket_vals = Vec::new();
             for conn in socket {
                 // Recurse first
                 self.build_trace_recursive(&conn.id, map)?;
                 
                 // Get value from cache (should be there if eval_recursive succeeded)
                 if let Some(val) = self.cache.get(&conn.id) {
                     socket_vals.push(val.clone());
                 }
             }
             display_inputs.push(socket_vals.first().cloned());
        }

        let result = self.cache.get(id).cloned().unwrap_or(SerdeValue::Null);

        let output_count = match node_type.as_str() {
             "outputNode" => 0,
             _ => 1
        };
        
        // Always produce 1 output in trace if count > 0 (or for outputNode we force it to 1 here for UI consistency)
        let trace_output_count = 1;
        let mut outputs = Vec::new();
        if trace_output_count > 0 {
            outputs.push(result);
        }

        let node_cache = NodeCache {
            inputs: display_inputs,
            outputs,
        };
        
        map.insert(id.to_string(), node_cache);
        Ok(())
    }
    
    fn eval_recursive(&mut self, id: &str) -> Result<SerdeValue, JsValue> {
         if let Some(val) = self.cache.get(id) {
             return Ok(val.clone());
         }

         let (node_type, node_data, input_connections) = {
             let node = self.nodes.get(id).ok_or(JsValue::from_str(&format!("Node dependency `{}` not found", id)))?;
             (node.node_type.clone(), node.data.clone(), node.inputs.clone())
         };

         let mut input_values: Vec<Vec<SerdeValue>> = Vec::new();
         for socket in input_connections {
             let mut socket_vals = Vec::new();
             for conn in socket {
                 let val = self.eval_recursive(&conn.id)?;
                 socket_vals.push(val);
             }
             input_values.push(socket_vals);
         }

         let result = self.compute_logic(&node_type, &input_values, &node_data)?;

         self.cache.insert(id.to_string(), result.clone());
         Ok(result)
    }

    fn compute_logic(&self, node_type: &str, inputs: &Vec<Vec<SerdeValue>>, data: &Vec<SerdeValue>) -> Result<SerdeValue, JsValue> {
         // Lookup logic closure from registry
         if let Some(def) = self.node_registry.get(node_type) {
             match (def.logic)(inputs, data) {
                 Ok(val) => Ok(val),
                 Err(e) => Err(JsValue::from_str(&e))
             }
         } else {
             Err(JsValue::from_str(&format!("Logic not found for node type: {}", node_type)))
         }
    }
}
