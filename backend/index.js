const express = require("express");
const cors = require("cors");
const analyzeRoute = require("./routes/analyze");

const app = express();
app.use(cors());
app.use(express.json());

app.use("/api/analyze", analyzeRoute);

app.listen(5001, () => {
  console.log("Server running on port 5001");
});