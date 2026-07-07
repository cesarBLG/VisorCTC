import React from "react";

export default function ContadoresEjes({ columns, onAction }) {
  return (
    <div style={{ display: "flex", gap: "20px" }}>
      {columns.map((col) => (
        <div
          key={col}
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "10px",
            alignItems: "center",
          }}
        >
          <button onClick={() => onAction(col, false)}>
            {col} impar
          </button>
          <button onClick={() => onAction(col, true)}>
            {col} par
          </button>
        </div>
      ))}
    </div>
  );
}
