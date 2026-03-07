const express = require("express");
const { analyzeRepository } = require("../controllers/analyzeController");

const router = express.Router();

router.post("/", analyzeRepository);

module.exports = router;