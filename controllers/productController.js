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
    res.status(500).json({ success: false, message: 'Failed to fetch products' });
  }
};

// Get product quantities
export const getProductQuantities = async (req, res) => {
  try {
    const result = await pool.query('SELECT id, brand, productname, quantity, discount_price, description FROM products ORDER BY brand ASC, id asc');
    res.json({ success: true, products: result.rows });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch product quantities' });
  }
};

// Get product details by ID
export const getProductNameById = async (req, res) => {
  try {
      const { id } = req.params; // Get product ID from route parameters

      // Fetch the product details
      const productQuery = 'SELECT productname FROM products WHERE id = $1';

      const productResult = await pool.query(productQuery, [id]);

      if (productResult.rows.length === 0) {
          return res.status(404).json({ success: false, message: 'Product not found' });
      }

      const product = productResult.rows[0];

      res.json({ success: true, product });
  } catch (error) {
      res.status(500).json({ success: false, message: 'Failed to fetch product' });
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
      res.status(500).json({ success: false, message: 'Failed to fetch product' });
  }
};

// Update product details
export const updateProduct = async (req, res) => {
  try {
      const { id } = req.params; // Get product ID from route parameters
      const { brand, productname, quantity, discount_price, description } = req.body; // Get updated fields from request body

      // Check if the product exists
      const checkProductQuery = 'SELECT * FROM products WHERE id = $1';
      const checkProductResult = await pool.query(checkProductQuery, [id]);

      if (checkProductResult.rows.length === 0) {
          return res.status(404).json({ success: false, message: 'Product not found' });
      }

      // Update the product details
      const updateQuery = `
          UPDATE products 
          SET brand = $1, productname = $2, quantity = $3, discount_price = $4, description = $5
          WHERE id = $6
          RETURNING *
      `;
      const values = [brand, productname, quantity, discount_price, description, id];
      const updateResult = await pool.query(updateQuery, values);

      return res.json({ success: true, product: updateResult.rows[0] });
  } catch (error) {
      res.status(500).json({ success: false, message: 'Failed to update product' });
  }
};

export const getSetOptions = async (req, res) => {
  const { setId } = req.params;

  try {
    // Query the database to get products in the set
    const setOptions = await pool.query(
      `SELECT so.product_id, p.productname, p.price, p.quantity, p.id 
       FROM Set_Options so
       JOIN Products p ON so.product_id = p.id
       WHERE so.set_product_id = $1 and p.quantity > 0`,
      [setId]
    );

    // Check if set options exist
    if (setOptions.rows.length === 0) {
      return res.status(404).json({ message: 'Set options not found.' });
    }

    res.status(200).json(setOptions.rows);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch set options.' });
  }
};