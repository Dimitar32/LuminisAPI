import pool from '../utils/db.js';

export const getOrders = async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM orders ORDER BY created_at DESC');
    res.json({ success: true, orders: result.rows });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch orders' });
  }
};

export const saveOrder = async (req, res) => {
    try {
        const { firstName, lastName, phone, address, city, note, orderItems } = req.body;

        if (!firstName || !lastName || !phone || !orderItems.length) {
            return res.status(400).json({ success: false, message: "Missing required fields" });
        }

        await pool.query("BEGIN");

        // Deduct stock and check availability
        for (const item of orderItems) {
            // Check if the product is a set
            const product = await pool.query(
                `SELECT is_set FROM products WHERE id = $1`,
                [item.id]
            );

            if (product.rows.length === 0) {
                await pool.query("ROLLBACK");
                return res.status(400).json({ success: false, message: `Product with ID ${item.id} not found.` });
            }


            if (product.rows[0].is_set) {
                // Deduct stock for the set product
                const updateSetStock = await pool.query(
                    `UPDATE products 
                     SET quantity = quantity - $1,
                         updateDate = NOW()
                     WHERE id = $2 AND quantity >= $1
                     RETURNING quantity`,
                    [item.quantity, item.id]
                );

                if (updateSetStock.rows.length === 0) {
                    await pool.query("ROLLBACK");
                    return res.status(400).json({
                        success: false,
                        message: `Няма достатъчно наличност за комплекта ${item.name}.`,
                    });
                }
                
                // Deduct stock for the selected product in the set
                const updateChosenProductStock = await pool.query(
                    `UPDATE products 
                     SET quantity = quantity - $1,
                         updateDate = NOW()
                     WHERE id = $2 AND quantity >= $1
                     RETURNING quantity`,
                    [item.quantity, item.option] // `item.option` should hold the ID of the chosen product from the set
                );

                if (updateChosenProductStock.rows.length === 0) {
                    await pool.query("ROLLBACK");
                    return res.status(400).json({
                        success: false,
                        message: `Няма достатъчно наличност за избрания продукт от комплекта.`,
                    });
                }
            } else {
                // Deduct stock for a normal product
                const updateStock = await pool.query(
                    `UPDATE products 
                     SET quantity = quantity - $1,
                         updateDate = NOW()
                     WHERE id = $2 AND quantity >= $1
                     RETURNING quantity`,
                    [item.quantity, item.id]
                );

                if (updateStock.rows.length === 0) {
                    await pool.query("ROLLBACK");
                    return res.status(400).json({
                        success: false,
                        message: `Няма достатъчно наличност за продукта ${item.name}.`,
                    });
                }
            }

            // const updateStock = await pool.query(
            //     `UPDATE products 
            //      SET quantity = quantity - $1 ,
            //          updateDate = NOW()
            //      WHERE id = $2 AND quantity >= $1 
            //      RETURNING quantity`,
            //     [item.quantity, item.id]
            // );

            // if (updateStock.rows.length === 0) {
            //     await pool.query("ROLLBACK");
            //     return res.status(400).json({
            //         success: false,
            //         message: `Няма достатъчно наличност от ${item.name}.`,
            //     });
            // }
        }

        // FIX: Use proper JSON storage
        const result = await pool.query(
            `INSERT INTO orders (first_name, last_name, phone, address, city, note, order_items, created_at)
            VALUES ($1, $2, $3, $4, $5, $6, CAST($7 AS JSONB), NOW()) RETURNING *`,
            [firstName, lastName, phone, address, city, note, JSON.stringify(orderItems)]
        );

        // FIX: Ensure the transaction is committed
        await pool.query("COMMIT");

        res.status(201).json({ success: true, order: result.rows[0] });
    } catch (error) {
        await pool.query("ROLLBACK");
        res.status(500).json({ success: false, message: "Failed to save order" });
    }
};

export const updateOrderStatus = async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;
  
    try {
      // Check if the order exists
      const order = await pool.query('SELECT * FROM orders WHERE id = $1', [id]);
      if (order.rows.length === 0) {
        return res.status(404).json({ success: false, message: 'Order not found' });
      }
  
      // Update the order status
      await pool.query('UPDATE orders SET status = $1 WHERE id = $2', [status, id]);
  
      res.json({ success: true, message: 'Order status updated successfully' });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Failed to update order status' });
    }
  };
  

export const deleteOrder = async(req, res) => {
    const { id } = req.params;

    try {
        // Check if the order exists
        const existingOrder = await pool.query("SELECT * FROM orders WHERE id = $1", [id]);
        if (existingOrder.rows.length === 0) {
            return res.status(404).json({ success: false, message: "Order not found" });
        }

        const order = existingOrder.rows[0];

        // Check if the order is not shipped
        if (order.status !== "shipped") {
            // Parse the order_items JSON
            const orderItems = JSON.parse(order.order_items);
            
            // Restock each product
            for (const item of orderItems) {
                // If the item is a set, restock the selected option from the set
                if (item.option !== "") {
                    // Increase quantity of the selected product in the set options
                    await pool.query(
                        `UPDATE products
                         SET quantity = quantity + $1,
                             updateDate = NOW()
                         WHERE id = $2`,
                        [item.quantity, item.option]
                    );
                }

                await pool.query(
                    `UPDATE products
                     SET quantity = quantity + $1,
                         updateDate = NOW()
                     WHERE id = $2`,
                    [item.quantity, item.id]
                );
            }
        }

        // Delete the order
        await pool.query("DELETE FROM orders WHERE id = $1", [id]);

        res.json({ success: true, message: "Order deleted successfully, and products restocked if applicable" });
    } catch (error) {
        res.status(500).json({ success: false, message: "Failed to delete order" });
    }
};