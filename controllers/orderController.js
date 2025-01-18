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

            const updateStock = await pool.query(
                `UPDATE products 
                 SET quantity = quantity - $1 ,
                     updateDate = NOW()
                 WHERE id = $2 AND quantity >= $1 
                 RETURNING quantity`,
                [item.quantity, item.id]
            );

            if (updateStock.rows.length === 0) {
                await pool.query("ROLLBACK");
                return res.status(400).json({
                    success: false,
                    message: `Няма достатъчно наличност от ${item.name}.`,
                });
            }
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
        console.error("❌ Error saving order:", error);
        res.status(500).json({ success: false, message: "Failed to save order" });
    }
  
  // const { firstName, lastName, phone, address, city, note, orderItems } = req.body;

  // try {
  //   if (!firstName || !lastName || !phone || !orderItems.length) {
  //     return res.status(400).json({ success: false, message: 'Missing required fields' });
  //   }

  //   await pool.query('BEGIN');

  //   for (const item of orderItems) {
  //     const updateStock = await pool.query(
  //       `UPDATE products SET quantity = quantity - $1 WHERE id = $2 AND quantity >= $1 RETURNING quantity`,
  //       [item.quantity, item.id]
  //     );

  //     if (updateStock.rows.length === 0) {
  //       await pool.query('ROLLBACK');
  //       return res.status(400).json({ success: false, message: `Insufficient stock for ${item.name}` });
  //     }
  //   }

  //   const result = await pool.query(
  //     `INSERT INTO orders (first_name, last_name, phone, address, city, note, order_items, created_at)
  //     VALUES ($1, $2, $3, $4, $5, $6, $7, NOW()) RETURNING *`,
  //     [firstName, lastName, phone, address, city, note, JSON.stringify(orderItems)]
  //   );

  //   await pool.query('COMMIT');
  //   res.status(201).json({ success: true, order: result.rows[0] });
  // } catch (error) {
  //   await pool.query('ROLLBACK');
  //   res.status(500).json({ success: false, message: 'Failed to save order' });
  // }
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
      console.error('❌ Error updating order status:', error);
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
        console.error("❌ Error deleting order:", error);
        res.status(500).json({ success: false, message: "Failed to delete order" });
    }
};