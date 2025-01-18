import pool from '../utils/db.js';

// Get all products or filter by brand
export const getProducts = async (req, res) => {
  try {
    const { brand } = req.query; // Extract brand from query parameters

    let query = 'SELECT * FROM products';
    let values = [];

    // If a brand is provided, filter by it
    if (brand) {
      query += ' WHERE brand = $1';
      values.push(brand);
    }

    query += ' ORDER BY id ASC';

    const result = await pool.query(query, values);

    // Modify response to include full image URLs
    const products = result.rows.map(product => ({
      ...product,
      imageUrl: `https://luminisapi.onrender.com/images/${product.productname}.png`,
    }));

    res.json({ success: true, products });
  } catch (error) {
    console.error('❌ Error fetching products:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch products' });
  }
};

// Get product quantities
export const getProductQuantities = async (req, res) => {
  try {
    const result = await pool.query('SELECT id, brand, productname, quantity FROM products ORDER BY id ASC');
    res.json({ success: true, products: result.rows });
  } catch (error) {
    console.error('❌ Error fetching product quantities:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch product quantities' });
  }
};
