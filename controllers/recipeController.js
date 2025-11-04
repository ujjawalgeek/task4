import Recipe from "../models/recipeModel.js";

//  Get all recipes
export const getAllRecipes = async (req, res) => {
  try {
    const recipes = await Recipe.find({}).lean(); 
    res.status(200).json({
      success: true,
      count: recipes.length,
      data: recipes,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
