let table = null;
let users = null;
let events = null;
let checkins = null;

const sidebarLabels = document.querySelectorAll('.sidebar .section .label');
const searchInput = document.getElementById('search');
const selectEventInput = document.getElementById('event');

const evtSource = new EventSource("http://127.0.0.1:8000/api/v1/checkins/stream/dashboard");
evtSource.addEventListener("checkin", function(event) {
  const data = JSON.parse(event.data.replace(/'/g, '"'));
  console.log(data)
  if (table) {
    table.clear().rows.add(data).draw();
  }
});

document.addEventListener('DOMContentLoaded', async () => {
    try {
        // const data = [
            // ["Tiger Nixon", "System Architect", "Edinburgh", "2011/04/25", 3120],
            // ["Garrett Winters", "Director", "Edinburgh", "2011/07/25", 5300],
            // ["Ashton Cox", "Junior Technical Author", "San Francisco", "2009/01/12", 4800],
            // ["Cedric Kelly", "Senior Javascript Developer", "Edinburgh", "2012/03/29", 433060],
            // ["Airi Satou", "Accountant", "Tokyo", "2008/11/28", 162700]
        // ];
    
        // const respForEvents = await axios.get('http://127.0.0.1:8000/api/v1/events/');
        // events = respForEvents.data;
        // selectEventInput.innerHTML = events.map(event => `
            // <option value="${event.id}">
                // ${event.name}
            // </option>
        // `).join('');
    
        // Khởi tạo DataTable
        table = new DataTable('#table', {
            data: [],
            columns: [
                // { title: "STT" },
                { title: "Họ tên", data: 'name' },
                { title: "Đơn vị", data: 'unit' }, // Mặc định rỗng nếu không có dữ liệu
                { title: "Chức vụ", data: 'position' },
                // { title: "Mã" },
                { title: "SĐT", data: 'phone_number' },
                { title: "Email", data: "email" },
                {
                    title: "Ảnh",
                    data: 'image_b64',
                    render: function (data, type, row) {
                        // Nếu có link ảnh thì hiển thị ảnh, nếu không thì hiển thị div "NO PHOTO"
                        if (data) {
                            return `<img src="data:image/jpeg;base64,${data}" alt="Ảnh" style="width: 50px; height: auto;">`;
                        } else {
                            return '<div class="photo-cell">NO PHOTO<br>AVAILABLE</div>';
                        }
                    },
                    orderable: false // Không cho phép sắp xếp cột này
                },
                { title: "Trạng thái check-in", data: 'status' },
                {
                    title: "Thời gian checkin",
                    data: 'checkin_time',
                    render: function (data, type, row) {
                        // Thêm class 'checkin-time' để styling màu đỏ
                        return `<span class="checkin-time">${data}</span>`;
                    }
                },
                // { title: "Thiết bị" }
            ],
            // searching: false,
            language: {
                search: "Tìm kiếm:",
                lengthMenu: "Hiển thị _MENU_ bản ghi",
                zeroRecords: "Không có dữ liệu",
                info: "Hiển thị từ _START_ đến _END_ trong tổng số _TOTAL_ bản ghi",
                infoEmpty: "Không có bản ghi nào",
                infoFiltered: "(được lọc từ _MAX_ bản ghi)",
                paginate: {
                    first: "Đầu",
                    last: "Cuối",
                    next: "Sau",
                    previous: "Trước"
                }
            }
        });
    } catch (err) {}
});

sidebarLabels.forEach(label => {
    label.addEventListener('click', () => {
        const section = label.closest('.sidebar .section');
        section.classList.toggle('active');
    });
});

searchInput.addEventListener("keyup", e => {
    table.search(e.target.value).draw();   // dùng API mới
});