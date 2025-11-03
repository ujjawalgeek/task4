import Recipe from "../models/recipeModel.js";

//  Return all recipes as an array of objects
export const getAllRecipes = async (req, res) => {
  try {
    const recipes = await Recipe.find({}).lean(); 
    res.json(recipes); 
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
