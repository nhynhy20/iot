const CUSTOMIZATION_ITEMS_PER_PAGE = 10;
let currentCustomizationPage = 1;
let sortColumn = 'id'; // Cột mặc định để sắp xếp
let sortDirection = 'asc'; // Hướng sắp xếp: 'asc' hoặc 'desc'
let selectedField = 'all'; // Trường mặc định là 'all' để tìm kiếm toàn bộ
let fullHistory = []; // Biến để lưu trữ toàn bộ dữ liệu lịch sử
let filteredHistory = []; // Biến để lưu trữ lịch sử đã lọc

// Cập nhật danh sách lịch sử trên giao diện
function updateCustomizationHistoryList(page = 1, pageSize = 10) {
    const historyList = document.getElementById('history-list');
    historyList.innerHTML = ''; // Xóa nội dung cũ trước khi cập nhật

    // Sử dụng filteredHistory nếu có, nếu không thì dùng fullHistory
    const historyToDisplay = filteredHistory.length > 0 ? filteredHistory : fullHistory;

    // Tính tổng số mục và số trang
    const totalItems = historyToDisplay.length;
    const totalPages = Math.ceil(totalItems / pageSize);
    const startIndex = (page - 1) * pageSize;
    const endIndex = Math.min(startIndex + pageSize, totalItems);

    for (let i = startIndex; i < endIndex; i++) {
        const item = historyToDisplay[i];
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${i + 1}</td>
            <td>${item.temperature}°C</td>
            <td>${item.humidity}%</td>
            <td>${item.light_level}%</td>
            <td>${item.timestamp}</td>
        `;
        historyList.appendChild(tr);
    }

    document.getElementById('prev-page').style.display = page > 1 ? 'inline-block' : 'none';
    document.getElementById('next-page').style.display = page < totalPages ? 'inline-block' : 'none';
    document.getElementById('page-info').textContent = `Trang ${page} / ${totalPages}`;
}

// Lấy dữ liệu lịch sử từ API và lưu trữ vào fullHistory
fetch('http://localhost:3000/api/sensors')
    .then(response => response.json())
    .then(history => {
        fullHistory = history; // Lưu trữ toàn bộ dữ liệu lịch sử
        updateCustomizationHistoryList(currentCustomizationPage, CUSTOMIZATION_ITEMS_PER_PAGE); // Cập nhật danh sách
    })
    .catch(error => console.error('Error fetching sensor history:', error));

// Xử lý chọn trường trong dropdown
document.querySelectorAll('.dropdown-content a').forEach(item => {
    item.addEventListener('click', function(event) {
        event.preventDefault();
        selectedField = this.getAttribute('data-field');
        document.querySelector('.dropdown-button').textContent = this.textContent;
    });
});

// Xử lý tìm kiếm dựa trên trường được chọn
document.getElementById('apply-filter').addEventListener('click', function() {
    const searchValue = document.getElementById('search-value').value.toLowerCase();

    // Lọc dữ liệu dựa trên trường được chọn
    if (selectedField === 'all') {
        filteredHistory = fullHistory.filter(entry => 
            entry.temperature.toString().toLowerCase().includes(searchValue) ||
            entry.humidity.toString().toLowerCase().includes(searchValue) ||
            entry.light_level.toString().toLowerCase().includes(searchValue) ||
            entry.timestamp.toLowerCase().includes(searchValue)
        );
    } else {
        filteredHistory = fullHistory.filter(entry => 
            entry[selectedField] && entry[selectedField].toString().toLowerCase().includes(searchValue)
        );
    }

    currentCustomizationPage = 1; // Reset về trang đầu tiên khi lọc
    updateCustomizationHistoryList(currentCustomizationPage, CUSTOMIZATION_ITEMS_PER_PAGE);
});

// Hàm sắp xếp giá trị
function sortData(history) {
    return history.sort((a, b) => {
        let valA = a[sortColumn];
        let valB = b[sortColumn];

        if (sortColumn === 'timestamp') {
            // Chuyển đổi timestamp thành số để so sánh
            valA = new Date(valA).getTime();
            valB = new Date(valB).getTime();
        } else if (sortColumn === 'id') {
            valA = parseInt(valA, 10);
            valB = parseInt(valB, 10);
        }

        return sortDirection === 'asc' ? (valA > valB ? 1 : -1) : (valA < valB ? 1 : -1);
    });
}

// Sắp xếp cột khi click vào tiêu đề cột
document.querySelectorAll('#history-table th').forEach(th => {
    th.addEventListener('click', function() {
        const column = th.getAttribute('data-column');
        
        // Kiểm tra xem cột hiện tại đã được sắp xếp hay chưa
        if (sortColumn === column) {
            sortDirection = sortDirection === 'asc' ? 'desc' : 'asc'; // Đảo ngược hướng sắp xếp
        } else {
            sortColumn = column; // Chọn cột mới để sắp xếp
            sortDirection = 'asc'; // Đặt lại hướng sắp xếp về tăng dần
        }

        // Sắp xếp và cập nhật danh sách
        const historyToSort = filteredHistory.length > 0 ? filteredHistory : fullHistory;
        const sortedHistory = sortData(historyToSort);
        currentCustomizationPage = 1; // Reset về trang đầu tiên khi sắp xếp
        updateCustomizationHistoryList(currentCustomizationPage, CUSTOMIZATION_ITEMS_PER_PAGE);
    });
});

// Xử lý sự kiện cho nút "Next Page"
document.getElementById('next-page').addEventListener('click', function() {
    const historyToDisplay = filteredHistory.length > 0 ? filteredHistory : fullHistory;
    const totalPages = Math.ceil(historyToDisplay.length / CUSTOMIZATION_ITEMS_PER_PAGE);
    if (currentCustomizationPage < totalPages) {
        currentCustomizationPage++;
        updateCustomizationHistoryList(currentCustomizationPage, CUSTOMIZATION_ITEMS_PER_PAGE);
    }
});

// Xử lý sự kiện cho nút "Previous Page"
document.getElementById('prev-page').addEventListener('click', function() {
    if (currentCustomizationPage > 1) {
        currentCustomizationPage--;
        updateCustomizationHistoryList(currentCustomizationPage, CUSTOMIZATION_ITEMS_PER_PAGE);
    }
});
