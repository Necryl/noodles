use serde::{Deserialize, Serialize};
use serde_json::Value as SerdeValue;
use std::collections::HashMap;

// --- Schema Structs (Sendable to Frontend) ---

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct SocketUI {
    #[serde(rename = "type")]
    pub ui_type: String, // "none", "show"
    #[serde(rename = "showName")]
    pub show_name: bool,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct SocketDef {
    pub name: String,
    #[serde(rename = "type")]
    pub val_type: String, // "boolean", "number", "string", "any"
    pub ui: SocketUI,
    #[serde(rename = "maxConnections")]
    pub max_connections: usize, // Use usize, serialize as number
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct DataUI {
    #[serde(rename = "type")]
    pub ui_type: String, // "input", "display"
    #[serde(rename = "showName")]
    pub show_name: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub options: Option<Vec<String>>,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct DataDef {
    #[serde(rename = "type")]
    pub data_type: String, // "plugin"
    #[serde(rename = "inputIndex")]
    pub input_index: usize,
    pub ui: DataUI,
    #[serde(rename = "defaultValue")]
    pub default_value: SerdeValue,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct IO {
    pub inputs: Vec<SocketDef>,
    pub outputs: Vec<SocketDef>,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct NodeSchema {
    pub name: String,
    pub io: IO,
    pub data: Vec<DataDef>,
    // Declarative flags for frontend behavior
    #[serde(rename = "autoEvaluateOnConnect")]
    pub auto_evaluate_on_connect: bool,
}

// --- Logic Definition ---

// Function pointer type for node logic
// Inputs: &[Vec<Value>] (connections), Data: &[Value] (local data)
// Output: Result<SerdeValue, String>
pub type LogicFn = Box<dyn Fn(&[Vec<SerdeValue>], &[SerdeValue]) -> Result<SerdeValue, String> + Send + Sync>;

// Combined Definition (Registry Item)
pub struct NodeDefinition {
    pub schema: NodeSchema,
    pub logic: LogicFn,
}

// --- Registry ---

pub fn get_node_registry() -> HashMap<String, NodeDefinition> {
    let mut reg = HashMap::new();

    // Helper to create common schemas
    let _max_inf = usize::MAX; // In JS represented as Infinity, simpler to just use a very large number or handle in serializer. 
    // Actually, `usize::MAX` serializes to a huge integer. JS `Infinity` is a special double. 
    // We can use a specific large number that TS treats as effective infinity or use `Option<usize>`?
    // Let's stick to `usize::MAX` and handle it on frontend if needed, or just use 9999.
    // `nodeDefs.ts` used `Infinity`.
    // Let's use `9999` for simplicity for "Infinity" in this context.
    let infinity = 9999; 

    // --- Helpers ---
    let mk_socket = |name: &str, typ: &str, ui: &str, show_name: bool, max: usize| SocketDef {
        name: name.to_string(),
        val_type: typ.to_string(),
        ui: SocketUI { ui_type: ui.to_string(), show_name },
        max_connections: max,
    };
    
    let mk_data = |idx: usize, ui: &str, default: SerdeValue| DataDef {
        data_type: "plugin".to_string(),
        input_index: idx,
        ui: DataUI { ui_type: ui.to_string(), show_name: false, options: None },
        default_value: default,
    };

    // --- Boolean ---
    reg.insert("booleanNode".to_string(), NodeDefinition {
        schema: NodeSchema {
            name: "Boolean".to_string(),
            io: IO {
                inputs: vec![mk_socket("value", "boolean", "none", false, 0)],
                outputs: vec![mk_socket("value", "boolean", "show", false, infinity)],
            },
            data: vec![mk_data(0, "input", serde_json::json!(false))],
            auto_evaluate_on_connect: false,
        },
        logic: Box::new(|_, data| {
            Ok(data.get(0).cloned().unwrap_or(serde_json::json!(false)))
        }),
    });

    // --- Number ---
    reg.insert("numberNode".to_string(), NodeDefinition {
        schema: NodeSchema {
            name: "Number".to_string(),
            io: IO {
                inputs: vec![mk_socket("value", "number", "none", false, 0)],
                outputs: vec![mk_socket("value", "number", "show", false, infinity)],
            },
            data: vec![mk_data(0, "input", serde_json::json!(0))],
            auto_evaluate_on_connect: false,
        },
        logic: Box::new(|_, data| {
            Ok(data.get(0).cloned().unwrap_or(serde_json::json!(0)))
        }),
    });

    // --- String ---
    reg.insert("stringNode".to_string(), NodeDefinition {
        schema: NodeSchema {
            name: "String".to_string(),
            io: IO {
                inputs: vec![mk_socket("value", "string", "none", false, 0)],
                outputs: vec![mk_socket("value", "string", "show", false, infinity)],
            },
            data: vec![mk_data(0, "input", serde_json::json!(""))],
            auto_evaluate_on_connect: false,
        },
        logic: Box::new(|_, data| {
            Ok(data.get(0).cloned().unwrap_or(serde_json::json!("")))
        }),
    });

    // --- Addition ---
    reg.insert("additionNode".to_string(), NodeDefinition {
        schema: NodeSchema {
            name: "Add".to_string(),
            io: IO {
                 inputs: vec![
                     mk_socket("a", "any", "show", false, 1),
                     mk_socket("b", "any", "show", false, 1),
                 ],
                 outputs: vec![mk_socket("sum", "any", "show", false, infinity)],
            },
            data: vec![
                mk_data(0, "input", serde_json::json!(0)),
                mk_data(1, "input", serde_json::json!(0)),
            ],
            auto_evaluate_on_connect: false,
        },
        logic: Box::new(|inputs, data| {
             let val_a = if !inputs.get(0).map(|v| v.is_empty()).unwrap_or(true) { inputs[0][0].clone() } else { data.get(0).cloned().unwrap_or(serde_json::json!(0)) };
             let val_b = if !inputs.get(1).map(|v| v.is_empty()).unwrap_or(true) { inputs[1][0].clone() } else { data.get(1).cloned().unwrap_or(serde_json::json!(0)) };
             
             if val_a.is_string() || val_b.is_string() {
                 let get_str = |v: &SerdeValue| -> String {
                     if let Some(s) = v.as_str() { s.to_string() }
                     else { v.to_string() }
                 };
                 Ok(serde_json::json!(format!("{}{}", get_str(&val_a), get_str(&val_b))))
             } else {
                 let f_a = val_a.as_f64().unwrap_or(0.0);
                 let f_b = val_b.as_f64().unwrap_or(0.0);
                 Ok(serde_json::json!(f_a + f_b))
             }
        }),
    });

    // --- Subtraction ---
    reg.insert("subractionNode".to_string(), NodeDefinition {
        schema: NodeSchema {
            name: "Subtract".to_string(),
            io: IO {
                 inputs: vec![
                     mk_socket("a", "number", "show", false, 1),
                     mk_socket("b", "number", "show", false, 1),
                 ],
                 outputs: vec![mk_socket("sum", "any", "show", false, infinity)],
            },
            data: vec![
                mk_data(0, "input", serde_json::json!(0)),
                mk_data(1, "input", serde_json::json!(0)),
            ],
            auto_evaluate_on_connect: false,
        },
        logic: Box::new(|inputs, data| {
            let get_num = |idx: usize| -> f64 {
                if idx < inputs.len() && !inputs[idx].is_empty() {
                    inputs[idx][0].as_f64().unwrap_or(0.0)
                } else {
                    data.get(idx).and_then(|v| v.as_f64()).unwrap_or(0.0)
                }
            };
            Ok(serde_json::json!(get_num(0) - get_num(1)))
        }),
    });

    // --- Multiplication ---
    reg.insert("multiplicationNode".to_string(), NodeDefinition {
        schema: NodeSchema {
            name: "Multiply".to_string(),
             io: IO {
                 inputs: vec![
                     mk_socket("a", "number", "show", false, 1),
                     mk_socket("b", "number", "show", false, 1),
                 ],
                 outputs: vec![mk_socket("sum", "any", "show", false, infinity)],
            },
            data: vec![
                mk_data(0, "input", serde_json::json!(0)),
                mk_data(1, "input", serde_json::json!(0)),
            ],
            auto_evaluate_on_connect: false,
        },
        logic: Box::new(|inputs, data| {
            let get_num = |idx: usize| -> f64 {
                if idx < inputs.len() && !inputs[idx].is_empty() {
                    inputs[idx][0].as_f64().unwrap_or(0.0)
                } else {
                    data.get(idx).and_then(|v| v.as_f64()).unwrap_or(0.0)
                }
            };
            Ok(serde_json::json!(get_num(0) * get_num(1)))
        }),
    });

    // --- Division ---
    reg.insert("divisionNode".to_string(), NodeDefinition {
        schema: NodeSchema {
            name: "Divide".to_string(),
             io: IO {
                 inputs: vec![
                     mk_socket("a", "number", "show", false, 1),
                     mk_socket("b", "number", "show", false, 1),
                 ],
                 outputs: vec![mk_socket("sum", "any", "show", false, infinity)],
            },
            data: vec![
                mk_data(0, "input", serde_json::json!(0)),
                mk_data(1, "input", serde_json::json!(0)),
            ],
            auto_evaluate_on_connect: false,
        },
        logic: Box::new(|inputs, data| {
            let get_num = |idx: usize| -> f64 {
                if idx < inputs.len() && !inputs[idx].is_empty() {
                    inputs[idx][0].as_f64().unwrap_or(0.0)
                } else {
                    data.get(idx).and_then(|v| v.as_f64()).unwrap_or(0.0)
                }
            };
            let a = get_num(0);
            let b = get_num(1);
            if b == 0.0 { Ok(serde_json::json!(0.0)) } else { Ok(serde_json::json!(a / b)) }
        }),
    });

    // --- Comparison ---
    reg.insert("comparisonNode".to_string(), NodeDefinition {
        schema: NodeSchema {
            name: "Compare".to_string(),
             io: IO {
                 inputs: vec![
                     mk_socket("a", "any", "show", false, 1),
                     mk_socket("b", "any", "show", false, 1),
                 ],
                 outputs: vec![mk_socket("isEqual", "boolean", "show", false, infinity)],
            },
            data: vec![
                mk_data(0, "input", serde_json::json!(0)),
                mk_data(1, "input", serde_json::json!(0)),
            ],
            auto_evaluate_on_connect: false,
        },
        logic: Box::new(|inputs, data| {
             let val_a = if !inputs.get(0).map(|v| v.is_empty()).unwrap_or(true) { inputs[0][0].clone() } else { data.get(0).cloned().unwrap_or(serde_json::json!(0)) };
             let val_b = if !inputs.get(1).map(|v| v.is_empty()).unwrap_or(true) { inputs[1][0].clone() } else { data.get(1).cloned().unwrap_or(serde_json::json!(0)) };
             Ok(serde_json::json!(val_a == val_b))
        }),
    });

    // --- If ---
    reg.insert("ifNode".to_string(), NodeDefinition {
         schema: NodeSchema {
            name: "If".to_string(),
             io: IO {
                 inputs: vec![
                     mk_socket("condition", "boolean", "show", false, 1),
                     mk_socket("trueValue", "any", "show", false, 1),
                     mk_socket("falseValue", "any", "show", false, 1),
                 ],
                 outputs: vec![mk_socket("output", "any", "show", false, infinity)],
            },
            data: vec![
                mk_data(0, "input", serde_json::json!(false)),
                mk_data(1, "input", serde_json::json!(0)),
                mk_data(2, "input", serde_json::json!(0)),
            ],
            auto_evaluate_on_connect: false,
        },
        logic: Box::new(|inputs, data| {
             let cond = if !inputs.get(0).map(|v| v.is_empty()).unwrap_or(true) { 
                 inputs[0][0].as_bool().unwrap_or(false) 
             } else { 
                 data.get(0).and_then(|v| v.as_bool()).unwrap_or(false) 
             };

             let val_true = if !inputs.get(1).map(|v| v.is_empty()).unwrap_or(true) { 
                 inputs[1].get(0).unwrap_or(&SerdeValue::Null)
             } else { 
                 data.get(1).unwrap_or(&SerdeValue::Null)
             };

             let val_false = if !inputs.get(2).map(|v| v.is_empty()).unwrap_or(true) { 
                 inputs[2].get(0).unwrap_or(&SerdeValue::Null)
             } else { 
                 data.get(2).unwrap_or(&SerdeValue::Null) 
             };

             Ok(if cond { val_true.clone() } else { val_false.clone() })
        }),
    });

    // --- Output ---
    reg.insert("outputNode".to_string(), NodeDefinition {
        schema: NodeSchema {
            name: "Output".to_string(),
            io: IO {
                inputs: vec![mk_socket("input", "any", "none", false, 1)],
                outputs: vec![],
            },
            data: vec![mk_data(0, "display", serde_json::json!(" "))],
            auto_evaluate_on_connect: true, // Use Declarative Flag!
        },
        logic: Box::new(|inputs, _| {
             if let Some(socket) = inputs.get(0) {
                 if !socket.is_empty() {
                     return Ok(socket[0].clone());
                 }
             }
             Ok(SerdeValue::Null)
        }),
    });

    reg
}
