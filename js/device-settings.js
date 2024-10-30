const DEVICE_ITEMS_PER_PAGE = 10;
let currentDevicePage = 1;
let deviceHistory = []; // Biến để lưu trữ lịch sử thiết bị

// Hàm lấy lịch sử thiết bị từ server
async function fetchDeviceHistory() {
    try {
        const response = await fetch('http://localhost:3000/api/devices/history');
        const data = await response.json();
        deviceHistory = data.sort((a, b) => a.id - b.id); // Sắp xếp theo ID
        console.log('Dữ liệu lịch sử thiết bị:', deviceHistory); // Kiểm tra dữ liệu
        return deviceHistory;
    } catch (error) {
        console.error('Lỗi khi lấy lịch sử thiết bị từ backend:', error);
        return [];
    }
}

// Cập nhật bảng với dữ liệu từ server
async function updateDeviceTable(history) {
    const tableBody = document.getElementById('device-settings-body');
    tableBody.innerHTML = ''; // Xóa nội dung cũ

    const startIndex = (currentDevicePage - 1) * DEVICE_ITEMS_PER_PAGE;
    const paginatedHistory = history.slice(startIndex, startIndex + DEVICE_ITEMS_PER_PAGE);

    paginatedHistory.forEach(entry => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${entry.id}</td>
            <td>${entry.device_name}</td>
            <td>${entry.status === 1 ? 'Bật' : 'Tắt'}</td>
            <td>${new Date(entry.timestamp).toLocaleString()}</td>
        `;
        tableBody.appendChild(tr);
    });
}

// Cập nhật phân trang
async function updateDevicePagination(history) {
    const totalPages = Math.ceil(history.length / DEVICE_ITEMS_PER_PAGE);

    document.getElementById('page-info').innerText = `Trang ${currentDevicePage} / ${totalPages}`;
    document.getElementById('prev-page').disabled = currentDevicePage === 1;
    document.getElementById('next-page').disabled = currentDevicePage === totalPages;
}

// Thay đổi trang
function changeDevicePage(direction) {
    currentDevicePage += direction;
    updateDeviceTable(deviceHistory);
    updateDevicePagination(deviceHistory);
}

// Tìm kiếm theo thời gian
async function searchByTimestamp() {
    const searchInput = document.getElementById('search-input').value;
    const filteredHistory = deviceHistory.filter(entry => {
        const entryTimestamp = new Date(entry.timestamp).toLocaleString();
        return entryTimestamp.includes(searchInput);
    });

    currentDevicePage = 1; // Đặt lại trang về 1 khi tìm kiếm
    updateDeviceTable(filteredHistory);
    updateDevicePagination(filteredHistory);
}

// Khởi tạo bảng và phân trang khi trang tải
document.addEventListener('DOMContentLoaded', function () {
    fetchDeviceHistory().then(history => {
        updateDeviceTable(history);
        updateDevicePagination(history);
    });

    document.getElementById('prev-page').addEventListener('click', () => changeDevicePage(-1));
    document.getElementById('next-page').addEventListener('click', () => changeDevicePage(1));
    document.getElementById('search-button').addEventListener('click', searchByTimestamp);
});

// // Cập nhật bảng mỗi 5 giây để kiểm tra dữ liệu mới
// setInterval(async () => {
//     await fetchDeviceHistory();
//     updateDeviceTable(deviceHistory);
//     updateDevicePagination(deviceHistory);
// }, 5000);
