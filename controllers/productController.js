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
    const productsResult = await pool.query(query, values);

    // Fetch images for products
    const imagesQuery = `
        SELECT product_id, image_url, is_primary 
        FROM product_images 
        WHERE product_id = ANY($1)
        ORDER BY is_primary DESC, id ASC
    `;
    const imagesResult = await pool.query(imagesQuery, [productsResult.rows.map(p => p.id)]);

    // Map images to products
    const productsWithImages = productsResult.rows.map(product => ({
        ...product,
        images: imagesResult.rows.filter(image => image.product_id === product.id),
    }));

    res.json({ success: true, products: productsWithImages });
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
// Get product details by ID
export const getProductById = async (req, res) => {
  try {
      const { id } = req.params; // Get product ID from route parameters

      // Fetch the product details
      const productQuery = 'SELECT * FROM products WHERE id = $1';
      const imagesQuery = 'SELECT image_url, is_primary FROM product_images WHERE product_id = $1 ORDER BY is_primary DESC';

      const productResult = await pool.query(productQuery, [id]);
      const imagesResult = await pool.query(imagesQuery, [id]);

      if (productResult.rows.length === 0) {
          return res.status(404).json({ success: false, message: 'Product not found' });
      }

      const product = productResult.rows[0];
      product.images = imagesResult.rows; // Attach images to the product

      res.json({ success: true, product });
  } catch (error) {
      console.error('Error fetching product by ID:', error);
      res.status(500).json({ success: false, message: 'Failed to fetch product' });
  }
};
