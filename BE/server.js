const express = require('express');
const bodyParser = require('body-parser');
const mysql = require('mysql');
const mqtt = require('mqtt');
const cors = require('cors');

const app = express();
app.use(bodyParser.json());
app.use(cors()); // Cho phép CORS

// Cấu hình kết nối MySQL
const db = mysql.createConnection({
    host: 'localhost',    // Địa chỉ máy chủ MySQL
    user: 'root',         // Tên người dùng MySQL
    password: '12345',    // Mật khẩu MySQL
    database: 'iot'       // Tên cơ sở dữ liệu
});

// Kết nối đến MySQL
db.connect((err) => {
    if (err) {
        throw err;
    }
    console.log('Đã kết nối MySQL');
});

// Cấu hình kết nối MQTT
const mqttOptions = {
    host: "172.20.10.13",  // Địa chỉ IP của broker
    port: 1883,           // Port của broker
    username: "nhi",      // Tài khoản MQTT
    password: "123456",   // Mật khẩu MQTT
};

// Kết nối tới MQTT broker
const mqttClient = mqtt.connect(mqttOptions);

// Đăng ký lắng nghe các topic MQTT
mqttClient.on('connect', () => {
    console.log('Đã kết nối đến MQTT Broker');
    
    mqttClient.subscribe('data_common', (err) => {
        if (err) {
            console.error('Không thể đăng ký topic data_common:', err);
        } else {
            console.log('Đã đăng ký lắng nghe topic data_common');
        }
    });

    mqttClient.subscribe('data', (err) => {
        if (err) {
            console.error('Không thể đăng ký topic data:', err);
        } else {
            console.log('Đã đăng ký lắng nghe topic data');
        }
    });
});

// Chuyển đổi timestamp sang định dạng MySQL với múi giờ địa phương
const getFormattedTimestamp = () => {
    const now = new Date();
    // Chuyển đổi sang múi giờ địa phương (Asia/Ho_Chi_Minh)
    const options = { timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' };
    return now.toLocaleString('sv-SE', options).replace(' ', 'T'); // Định dạng ISO 8601
};

// Xử lý tin nhắn nhận được từ MQTT
mqttClient.on('message', (topic, message) => {
    const data = JSON.parse(message.toString());
    const timestamp = getFormattedTimestamp(); // Lấy timestamp định dạng MySQL

    if (topic === 'data_common') {
        const { temperature, humidity, light } = data;
        const sqlSensor = 'INSERT INTO sensor_data (temperature, humidity, light_level, timestamp) VALUES (?, ?, ?, ?)';

        db.query(sqlSensor, [temperature, humidity, light, timestamp], (err, result) => {
            if (err) {
                console.error('Lỗi lưu dữ liệu cảm biến:', err);
            } else {
                console.log('Dữ liệu cảm biến đã được lưu:', result);
            }
        });
    }

    if (topic === 'data') {
        const { device, action } = data;
        const status = (action === 'true') ? 1 : 0;
        const sqlDevice = 'INSERT INTO device_status (device_name, status, timestamp) VALUES (?, ?, ?)';

        db.query(sqlDevice, [device, status, timestamp], (err, result) => {
            if (err) {
                console.error('Lỗi lưu trạng thái thiết bị:', err);
            } else {
                console.log(`Trạng thái thiết bị ${device} đã được lưu:`, result);
            }
        });
    }
});

// API POST: Lưu dữ liệu cảm biến
app.post('/api/sensors', (req, res) => {
    const { temperature, humidity, light_level } = req.body;
    const timestamp = getFormattedTimestamp(); // Lấy timestamp định dạng MySQL

    const sql = 'INSERT INTO sensor_data (temperature, humidity, light_level, timestamp) VALUES (?, ?, ?, ?)';
    
    db.query(sql, [temperature, humidity, light_level, timestamp], (err, result) => {
        if (err) {
            console.error('Lỗi khi lưu dữ liệu cảm biến:', err);
            return res.status(500).json({ error: 'Lỗi server' });
        }
        res.json({ message: 'Dữ liệu cảm biến đã được lưu thành công', result });
    });
});

// API POST: Bật/tắt thiết bị và lưu lịch sử
app.post('/api/devices', (req, res) => {
    const { device_name, status } = req.body; // status là true hoặc false
    const sql = 'INSERT INTO device_status (device_name, status, timestamp) VALUES (?, ?, ?)';
    const timestamp = getFormattedTimestamp(); // Lấy timestamp định dạng MySQL

    db.query(sql, [device_name, status ? 1 : 0, timestamp], (err, result) => {
        if (err) {
            console.error('Lỗi khi lưu trạng thái thiết bị:', err);
            return res.status(500).json({ error: 'Lỗi server' });
        }

        const payload = { device: device_name, action: status ? "true" : "false" };
        mqttClient.publish('data', JSON.stringify(payload));
        
        res.json({ message: `Thiết bị ${device_name} đã được cập nhật`, result });
    });
});

// API GET: Lấy lịch sử bật/tắt thiết bị
app.get('/api/devices/history', (req, res) => {
    const query = 'SELECT * FROM device_status ORDER BY timestamp DESC';
    db.query(query, (err, results) => {
        if (err) {
            console.error('Lỗi khi lấy lịch sử thiết bị:', err);
            return res.status(500).json({ error: 'Lỗi server' });
        }
        res.json(results);
    });
});

// API GET: Lấy dữ liệu cảm biến mới nhất
app.get('/api/sensors/latest', (req, res) => {
    const query = 'SELECT * FROM sensor_data ORDER BY timestamp DESC LIMIT 1';
    db.query(query, (err, result) => {
        if (err) {
            console.error('Lỗi khi lấy dữ liệu cảm biến mới nhất:', err);
            return res.status(500).json({ error: 'Lỗi server' });
        }
        const formattedResult = {
            ...result[0],
            timestamp: result[0].timestamp.toISOString().slice(0, 19).replace('T', ' '), // Chuyển đổi lại định dạng nếu cần
        };
        res.json(formattedResult);
    });
});

// Route: Lấy danh sách dữ liệu cảm biến
app.get('/api/sensors', (req, res) => {
    const query = "SELECT * FROM sensor_data ORDER BY timestamp DESC"; // Sắp xếp theo thời gian ghi nhận
    db.query(query, (err, results) => {
        if (err) {
            console.error('Lỗi khi lấy dữ liệu cảm biến:', err);
            return res.status(500).json({ error: 'Lỗi khi lấy dữ liệu cảm biến' });
        }
        
        // Chuyển đổi định dạng timestamp cho tất cả kết quả nếu cần
        const formattedResults = results.map(row => ({
            ...row,
            timestamp: row.timestamp.toISOString().slice(0, 19).replace('T', ' '),
        }));
        
        res.json(formattedResults); // Trả về kết quả dưới dạng JSON
    });
});

// Khởi động server
const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Server chạy trên cổng ${PORT}`);
});



// const express = require('express');
// const bodyParser = require('body-parser');
// const mysql = require('mysql');
// const mqtt = require('mqtt');
// const cors = require('cors');

// const app = express();
// app.use(bodyParser.json());
// app.use(cors()); // Cho phép CORS

// // Cấu hình kết nối MySQL
// const db = mysql.createConnection({
//     host: 'localhost',    // Địa chỉ máy chủ MySQL
//     user: 'root',         // Tên người dùng MySQL
//     password: '12345',    // Mật khẩu MySQL
//     database: 'iot'       // Tên cơ sở dữ liệu
// });

// // Kết nối đến MySQL
// db.connect((err) => {
//     if (err) {
//         throw err;
//     }
//     console.log('Đã kết nối MySQL');
// });

// // Cấu hình kết nối MQTT
// const mqttOptions = {
//     host: "172.20.10.13",  // Địa chỉ IP của broker
//     port: 1883,           // Port của broker
//     username: "nhi",      // Tài khoản MQTT
//     password: "123456",   // Mật khẩu MQTT
// };

// // Kết nối tới MQTT broker
// const mqttClient = mqtt.connect(mqttOptions);

// // Đăng ký lắng nghe các topic MQTT
// mqttClient.on('connect', () => {
//     console.log('Đã kết nối đến MQTT Broker');
    
//     mqttClient.subscribe('data_common', (err) => {
//         if (err) {
//             console.error('Không thể đăng ký topic data_common:', err);
//         } else {
//             console.log('Đã đăng ký lắng nghe topic data_common');
//         }
//     });

//     mqttClient.subscribe('data', (err) => {
//         if (err) {
//             console.error('Không thể đăng ký topic data:', err);
//         } else {
//             console.log('Đã đăng ký lắng nghe topic data');
//         }
//     });
// });

// // Chuyển đổi timestamp sang định dạng MySQL
// const getFormattedTimestamp = () => {
//     return new Date().toISOString().slice(0, 19).replace('T', ' ');
// };

// // Xử lý tin nhắn nhận được từ MQTT
// mqttClient.on('message', (topic, message) => {
//     const data = JSON.parse(message.toString());
//     const timestamp = getFormattedTimestamp(); // Lấy timestamp định dạng MySQL

//     if (topic === 'data_common') {
//         const { temperature, humidity, light } = data;
//         const sqlSensor = 'INSERT INTO sensor_data (temperature, humidity, light_level, timestamp) VALUES (?, ?, ?, ?)';

//         db.query(sqlSensor, [temperature, humidity, light, timestamp], (err, result) => {
//             if (err) {
//                 console.error('Lỗi lưu dữ liệu cảm biến:', err);
//             } else {
//                 console.log('Dữ liệu cảm biến đã được lưu:', result);
//             }
//         });
//     }

//     if (topic === 'data') {
//         const { device, action } = data;
//         const status = (action === 'true') ? 1 : 0;
//         const sqlDevice = 'INSERT INTO device_status (device_name, status, timestamp) VALUES (?, ?, ?)';

//         db.query(sqlDevice, [device, status, timestamp], (err, result) => {
//             if (err) {
//                 console.error('Lỗi lưu trạng thái thiết bị:', err);
//             } else {
//                 console.log(`Trạng thái thiết bị ${device} đã được lưu:`, result);
//             }
//         });
//     }
// });

// // API POST: Lưu dữ liệu cảm biến
// app.post('/api/sensors', (req, res) => {
//     const { temperature, humidity, light_level } = req.body;
//     const timestamp = getFormattedTimestamp(); // Lấy timestamp định dạng MySQL

//     const sql = 'INSERT INTO sensor_data (temperature, humidity, light_level, timestamp) VALUES (?, ?, ?, ?)';
    
//     db.query(sql, [temperature, humidity, light_level, timestamp], (err, result) => {
//         if (err) {
//             console.error('Lỗi khi lưu dữ liệu cảm biến:', err);
//             return res.status(500).json({ error: 'Lỗi server' });
//         }
//         res.json({ message: 'Dữ liệu cảm biến đã được lưu thành công', result });
//     });
// });

// // API POST: Bật/tắt thiết bị và lưu lịch sử
// app.post('/api/devices', (req, res) => {
//     const { device_name, status } = req.body; // status là true hoặc false
//     const sql = 'INSERT INTO device_status (device_name, status, timestamp) VALUES (?, ?, ?)';
//     const timestamp = getFormattedTimestamp(); // Lấy timestamp định dạng MySQL

//     db.query(sql, [device_name, status ? 1 : 0, timestamp], (err, result) => {
//         if (err) {
//             console.error('Lỗi khi lưu trạng thái thiết bị:', err);
//             return res.status(500).json({ error: 'Lỗi server' });
//         }

//         const payload = { device: device_name, action: status ? "true" : "false" };
//         mqttClient.publish('data', JSON.stringify(payload));
        
//         res.json({ message: `Thiết bị ${device_name} đã được cập nhật`, result });
//     });
// });

// // API GET: Lấy lịch sử bật/tắt thiết bị
// app.get('/api/devices/history', (req, res) => {
//     const query = 'SELECT * FROM device_status ORDER BY timestamp DESC';
//     db.query(query, (err, results) => {
//         if (err) {
//             console.error('Lỗi khi lấy lịch sử thiết bị:', err);
//             return res.status(500).json({ error: 'Lỗi server' });
//         }
//         res.json(results);
//     });
// });

// // API GET: Lấy dữ liệu cảm biến mới nhất
// app.get('/api/sensors/latest', (req, res) => {
//     const query = 'SELECT * FROM sensor_data ORDER BY timestamp DESC LIMIT 1';
//     db.query(query, (err, result) => {
//         if (err) {
//             console.error('Lỗi khi lấy dữ liệu cảm biến mới nhất:', err);
//             return res.status(500).json({ error: 'Lỗi server' });
//         }
//         const formattedResult = {
//             ...result[0],
//             timestamp: result[0].timestamp.toISOString().slice(0, 19).replace('T', ' '), // Chuyển đổi lại định dạng nếu cần
//         };
//         res.json(formattedResult);
//     });
// });

// // Route: Lấy danh sách dữ liệu cảm biến
// app.get('/api/sensors', (req, res) => {
//     const query = "SELECT * FROM sensor_data ORDER BY timestamp DESC"; // Sắp xếp theo thời gian ghi nhận
//     db.query(query, (err, results) => {
//         if (err) {
//             console.error('Lỗi khi lấy dữ liệu cảm biến:', err);
//             return res.status(500).json({ error: 'Lỗi khi lấy dữ liệu cảm biến' });
//         }
        
//         // Chuyển đổi định dạng timestamp cho tất cả kết quả nếu cần
//         const formattedResults = results.map(row => ({
//             ...row,
//             timestamp: row.timestamp.toISOString().slice(0, 19).replace('T', ' '),
//         }));
        
//         res.json(formattedResults); // Trả về kết quả dưới dạng JSON
//     });
// });

// // Khởi động server
// const PORT = 3000;
// app.listen(PORT, () => {
//     console.log(`Server chạy trên cổng ${PORT}`);
// });