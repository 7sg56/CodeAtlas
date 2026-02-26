"use client";
import { useState } from "react";

export default function Home() {
  const [url, setUrl] = useState("");
  const [data, setData] = useState<any>(null);

  const analyze = async () => {
    const res = await fetch("http://localhost:5001/api/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ githubUrl: url }),
    });

    const result = await res.json();
    setData(result);
  };

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">CodeAtlas v0.1</h1>

      <input
        className="border p-2 w-full"
        placeholder="GitHub Repo URL"
        value={url}
        onChange={(e) => setUrl(e.target.value)}
      />

      <button
        onClick={analyze}
        className="mt-4 bg-black text-white px-4 py-2"
      >
        Analyze
      </button>

      {data && (
        <pre className="mt-6 bg-gray-100 p-4 overflow-auto">
          {JSON.stringify(data, null, 2)}
        </pre>
      )}
    </div>
  );
}