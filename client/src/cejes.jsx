import React from "react";

const buttonStyle = {
  minWidth: 92,
  whiteSpace: "nowrap",
};

export default function ContadoresEjes({ columns, onAction, labels = ["impar", "par"] }) {
  return (
    <div style={{ display: "flex", gap: "10px" }}>
      {columns.map((col) => (
        <div
          key={col}
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "6px",
            alignItems: "center",
          }}
        >
          {/* first action */}
          <button onClick={() => onAction(col, false)} style={buttonStyle}>
            {col}
            <div>{labels[0]}</div>
          </button>
          {/* second action */}
          <button onClick={() => onAction(col, true)} style={buttonStyle}>
            {col}
            <div>{labels[1]}</div>
          </button>
        </div>
      ))}
    </div>
  );
}
