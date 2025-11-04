import mongoose from "mongoose";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import Recipe from "../models/recipeModel.js";

dotenv.config({ path: "./.env" });

const jsonPath = path.resolve("./recipe_final_processed.json");

const jsonData = JSON.parse(fs.readFileSync(jsonPath, "utf-8"));

const importData = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("MongoDB connected successfully");

    const validData = jsonData.filter(
      (item) => item.recipe_name && item.recipe_name.trim() !== ""
    );

    console.log(
      ` Found ${jsonData.length} total records, importing ${validData.length} valid recipes...`
    );

    await Recipe.deleteMany(); 
    await Recipe.insertMany(validData, { ordered: false });

    console.log(` Successfully imported ${validData.length} recipes`);
    process.exit();
  } catch (error) {
    console.error(" Error importing data:", error.message);
    process.exit(1);
  }
};

importData();
