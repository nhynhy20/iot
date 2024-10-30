
// Cập nhật bảng điều khiển và tạo biểu đồ với các giá trị hiện tại
document.addEventListener('DOMContentLoaded', async function() {
    const initialData = await fetchSensorData(); // Lấy dữ liệu từ MySQL ngay khi trang tải
    createChart(initialData); // Tạo biểu đồ với dữ liệu ban đầu

    // Thêm sự kiện cho các nút bật/tắt thiết bị
    document.getElementById('toggle-light').addEventListener('click', () => {
        console.log('Light button clicked'); // Kiểm tra sự kiện click
        toggleDevice('light');
    });
    document.getElementById('toggle-fan').addEventListener('click', () => toggleDevice('fan'));
    document.getElementById('toggle-ac').addEventListener('click', () => toggleDevice('ac'));
});

// Hàm để bật/tắt trạng thái thiết bị và lưu các giá trị đã cập nhật
async function toggleDevice(device) {
    const status = document.getElementById(`toggle-${device}`).textContent === 'Off';
    try {
        const response = await fetch(`http://localhost:3000/api/devices`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ device_name: device, status })  // Gửi tên thiết bị và trạng thái
        });

        if (response.ok) {
            console.log(`Toggle request for ${device} successful`);
            fetchSensorData(); // Cập nhật dữ liệu cảm biến sau khi bật/tắt thiết bị
            document.getElementById(`toggle-${device}`).textContent = status ? 'On' : 'Off';

            // Cập nhật lớp CSS cho từng thiết bị
            const lightIcon = document.getElementById('light-icon');
            const acIcon = document.getElementById('ac-icon');
            const fanIcon = document.getElementById('fan-icon');

            if (device === 'light') {
                if (status) {
                    lightIcon.classList.add('on'); // Thêm lớp 'on' cho đèn
                } else {
                    lightIcon.classList.remove('on'); // Xóa lớp 'on' cho đèn
                }
            } else if (device === 'ac') {
                if (status) {
                    acIcon.classList.add('moving'); // Thêm lớp 'moving' cho điều hòa
                } else {
                    acIcon.classList.remove('moving'); // Xóa lớp 'moving' cho điều hòa
                }
            } else if (device === 'fan') {
                if (status) {
                    fanIcon.classList.add('rotating'); // Thêm lớp 'rotating' cho quạt
                } else {
                    fanIcon.classList.remove('rotating'); // Xóa lớp 'rotating' cho quạt
                }
            }
        } else {
            console.error(`Failed to toggle ${device}, status: ${response.status}`);
        }
    } catch (error) {
        console.error(`Lỗi khi bật/tắt thiết bị ${device}:`, error);
    }
}





// Hàm để cập nhật giao diện bảng điều khiển
function updateDashboard(data) {
    updateTemperatureDisplay(data.temperature);
    document.getElementById('humidity-box').textContent = `💧 Humid ${data.humidity}%`;
    document.getElementById('light-box').textContent = `💡 Light ${data.light_level}`;
    updateDeviceStatus(data);
}

// Hàm để cập nhật hiển thị nhiệt độ
function updateTemperatureDisplay(temperature) {
    const tempBox = document.getElementById('temp-box');
    let tempClass;

    if (temperature <= 15) {
        tempClass = 'temp-low';
    } else if (temperature <= 50) {
        tempClass = 'temp-medium';
    } else {
        tempClass = 'temp-high';
    }

    tempBox.textContent = `🌡 Nhiệt độ ${temperature}°C`;
    tempBox.className = tempClass;
}

// Hàm để cập nhật trạng thái thiết bị
function updateDeviceStatus(data) {
    const fanIcon = document.getElementById('fan-icon');
    const acIcon = document.getElementById('ac-icon');
    const lightIcon = document.getElementById('light-icon');

    // Cập nhật trạng thái quạt
    const fanStatusElement = document.getElementById('fan-status');
    if (data.fan === 'on') {
        fanIcon.classList.add('rotating');
        fanStatusElement.textContent = 'Quạt: Bật';
    } else {
        fanIcon.classList.remove('rotating');
        fanStatusElement.textContent = 'Quạt: Tắt';
    }

    // Cập nhật trạng thái điều hòa
    const acStatusElement = document.getElementById('ac-status');
    if (data.ac === 'on') {
        acIcon.classList.add('blowing');
        acStatusElement.textContent = 'Điều Hòa: Bật';
    } else {
        acIcon.classList.remove('blowing');
        acStatusElement.textContent = 'Điều Hòa: Tắt';
    }

    // Cập nhật trạng thái đèn
    const lightStatusElement = document.getElementById('light-status');
    if (data.lightStatus === 'on') {
        lightIcon.src = 'https://img.icons8.com/plasticine/100/000000/light-on.png';
        lightStatusElement.textContent = 'Đèn: Bật';
        lightStatusElement.classList.add('on');
        lightStatusElement.classList.remove('off');
    } else {
        lightIcon.src = 'https://img.icons8.com/plasticine/100/000000/light-off.png';
        lightStatusElement.textContent = 'Đèn: Tắt';
        lightStatusElement.classList.add('off');
        lightStatusElement.classList.remove('on');
    }
}

// Hàm để tạo biểu đồ với dữ liệu hiện tại
let myChart; // Lưu tham chiếu đến biểu đồ

function createChart() {
    const ctx = document.getElementById('myChart').getContext('2d');

    myChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: [],
            datasets: [
                {
                    label: 'Temperature',
                    data: [],
                    borderColor: 'red',
                    fill: false
                },
                {
                    label: 'Humid',
                    data: [],
                    borderColor: 'blue',
                    fill: false
                },
                {
                    label: 'Light',
                    data: [],
                    borderColor: 'yellow',
                    fill: false
                }
            ]
        },
        options: {
            scales: {
                y: {
                    beginAtZero: true
                }
            }
        }
    });
}

// Hàm để cập nhật biểu đồ với dữ liệu mới
function updateChart(newData) {
    const timestamp = new Date().toLocaleTimeString();

    myChart.data.labels.push(timestamp);
    myChart.data.datasets[0].data.push(newData.temperature);
    myChart.data.datasets[1].data.push(newData.humidity);
    myChart.data.datasets[2].data.push(newData.light_level);

    myChart.update();
}

// Hàm để lấy dữ liệu cảm biến
async function fetchSensorData() {
    try {
        const response = await fetch('http://localhost:3000/api/sensors/latest');
        const data = await response.json();
        console.log('Dữ liệu cảm biến nhận được:', data);
        updateDashboard(data);   // Cập nhật dữ liệu trên giao diện
        updateChart(data);       // Cập nhật biểu đồ với dữ liệu mới
        return data; // Trả về dữ liệu để sử dụng trong tạo biểu đồ
    } catch (error) {
        console.error('Lỗi khi lấy dữ liệu cảm biến:', error);
    }
}

// Gọi hàm fetchSensorData mỗi 10 giây
setInterval(fetchSensorData, 10000);


