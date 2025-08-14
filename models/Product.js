import mongoose from "mongoose";

const productSchema = new mongoose.Schema(
  {
    id: { type: String, required: true },
    name: { type: String, required: true },
    description: { type: String, default: "" },
    img: { type: String, default: "" },
    category: { type: String, default: "Uncategorized" },
    sub_category: { type: String, default: "Uncategorized" },
    food_type: { type: String, default: "temp" },
    variants: { type: Array, default: [] },
    item_type: { type: String, default: "Goods" },
    base_price: { type: Number, required: true, min: 0 },
    userId: { type: String, required: true },
    projectId: { type: String, required: true },
  },
  { timestamps: true }
);

const Product = mongoose.model("Product", productSchema);
export default Product;
