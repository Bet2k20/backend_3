const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// ======== BIẾN LƯU TRỮ TRẠNG THÁI SERVER ========
// Biến lưu trữ trạng thái game
let gameSession = {
  isActive: false,
  startTime: null,
  endTime: null
};

// Biến lưu trữ kết quả từ users (mảng các object kết quả)
let gameResults = [];

// Biến lưu trữ người chơi đã kết nối (dùng Set để tránh trùng lặp)
let connectedPlayers = new Set();

// ======== API QUẢN LÝ PHIÊN GAME ========

// POST - LanAnhT02 bắt đầu game
app.post('/api/game/start', (req, res) => {
  try {
    const { user } = req.body;

    // Kiểm tra phải là MinhMinhT02
    if (user.username !== 'MinhMinhT02' || user.fullname !== 'Minh Minh') {
      return res.status(403).json({
        success: false,
        message: 'Chỉ MinhMinhT02 mới có quyền bắt đầu game!'
      });
    }
    
    // Bắt đầu game mới
    gameSession = {
      isActive: true,
      startTime: new Date().toISOString(),
      endTime: null
    };
    
    // Reset kết quả cũ của game trước
    gameResults = [];
    
    // Note: Không xóa connectedPlayers ở đây nữa. 
    // connectedPlayers sẽ được giữ lại để theo dõi những ai đã kết nối.
    // Nếu muốn reset hoàn toàn danh sách người chơi, có thể uncomment dòng dưới.
    // connectedPlayers.clear(); 

    console.log('🎮 Game đã bắt đầu bởi MinhMinhT02');

    res.json({
      success: true,
      message: 'Game đã bắt đầu!',
      session: gameSession
    });
  } catch (error) {
    console.error('❌ Lỗi khi bắt đầu game:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi server khi bắt đầu game'
    });
  }
});

// POST - LanAnhT02 kết thúc game
app.post('/api/game/end', (req, res) => {
  try {
    const { user } = req.body;
    
    // Kiểm tra phải là LanAnhT02
    if (user.username !== 'MinhMinhT02' || user.fullname !== 'Minh Minh') {
      return res.status(403).json({
        success: false,
        message: 'Chỉ MinhMinhT02 mới có quyền kết thúc game!'
      });
    }
    
    // Kết thúc game
    gameSession.isActive = false;
    gameSession.endTime = new Date().toISOString();

    console.log('🏁 Game đã kết thúc bởi MinhMinhT02');

    res.json({
      success: true,
      message: 'Game đã kết thúc!',
      session: gameSession,
      // Có thể trả kèm kết quả cuối cùng nếu cần
      // results: gameResults 
    });
  } catch (error) {
    console.error('❌ Lỗi khi kết thúc game:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi server khi kết thúc game'
    });
  }
});

// GET - Kiểm tra trạng thái game
app.get('/api/game/status', (req, res) => {
  try {
    res.json({
      success: true,
      session: gameSession
    });
  } catch (error) {
    console.error('❌ Lỗi khi kiểm tra trạng thái game:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi server khi kiểm tra trạng thái game'
    });
  }
});

// ======== API THEO DÕI NGƯỜI CHƠI KẾT NỐI ========

// POST - Theo dõi người chơi đăng nhập (kết nối)
app.post('/api/player/connect', (req, res) => {
  try {
    const { user } = req.body;
    
    // Tạo key duy nhất cho người chơi
    const playerKey = `${user.username}|${user.fullname}`;
    // Thêm vào Set (Set tự động loại bỏ trùng lặp)
    connectedPlayers.add(playerKey);
    
    console.log(`👤 Người chơi đã kết nối: ${user.fullname} (${user.username})`);
    console.log(`👥 Tổng số người chơi đang kết nối: ${connectedPlayers.size}`);
    
    res.json({
      success: true,
      message: 'Đã ghi nhận kết nối',
      connectedPlayers: connectedPlayers.size
    });
  } catch (error) {
    console.error('❌ Lỗi khi theo dõi kết nối người chơi:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi server khi theo dõi kết nối'
    });
  }
});

// GET - Lấy danh sách người chơi đã kết nối
app.get('/api/players/connected', (req, res) => {
  try {
    // Chuyển Set thành Array để gửi về frontend
    const playersArray = Array.from(connectedPlayers).map(playerKey => {
      const [username, fullname] = playerKey.split('|');
      return { username, fullname };
    });
    
    res.json({
      success: true,
      players: playersArray,
      count: playersArray.length
    });
  } catch (error) {
    console.error('❌ Lỗi khi lấy danh sách người chơi:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi server khi lấy danh sách người chơi'
    });
  }
});

// ======== API XỬ LÝ KẾT QUẢ GAME ========

// POST - User gửi kết quả (chỉ khi game đang active)
// Cập nhật để xử lý cấu trúc items mới { french: [...], vietnam: [...], unassigned: [...] }
app.post('/api/results', (req, res) => {
  try {
    // Kiểm tra game có đang active không
    if (!gameSession.isActive) {
      return res.status(400).json({
        success: false,
        message: 'Game chưa bắt đầu hoặc đã kết thúc!'
      });
    }
    
    const data = req.body;
    
    // Validate dữ liệu cơ bản
    if (!data.user || !data.items) {
      return res.status(400).json({
        success: false,
        message: 'Dữ liệu gửi lên không hợp lệ. Thiếu user hoặc items.'
      });
    }

    // Tạo object kết quả để lưu
    const result = {
      user: data.user,
      items: data.items, // Giữ nguyên cấu trúc { french, vietnam, unassigned }
      submittedAt: new Date().toISOString()
    };
    
    // Thêm kết quả vào mảng
    gameResults.push(result);
    
    console.log(`✅ Nhận kết quả từ ${data.user.fullname} (Tổng: ${gameResults.length} kết quả)`);
    
    res.json({
      success: true,
      message: 'Kết quả đã được lưu!'
    });
  } catch (error) {
    console.error('❌ Lỗi khi nhận kết quả:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi server khi nhận kết quả'
    });
  }
});

// GET - Lấy tất cả kết quả (cho LanAnhT02 xem)
app.get('/api/results', (req, res) => {
  try {
    res.json({
      success: true,
      results: gameResults,
      count: gameResults.length
    });
  } catch (error) {
    console.error('❌ Lỗi khi lấy kết quả:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi server khi lấy kết quả'
    });
  }
});

// ======== API KIỂM TRA SỨC KHỎE SERVER ========
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'Backend đang hoạt động ổn định',
    timestamp: new Date().toISOString()
  });
});

// Root endpoint - Thông tin API
app.get('/', (req, res) => {
  res.json({
    message: 'Multiplayer Drag & Drop Game Backend API',
    endpoints: {
      'POST /api/game/start': 'MinhMinhT02 bắt đầu game',
      'POST /api/game/end': 'MinhMinhT02 kết thúc game',
      'GET /api/game/status': 'Kiểm tra trạng thái game',
      'POST /api/player/connect': 'Theo dõi người chơi đăng nhập',
      'GET /api/players/connected': 'Lấy danh sách người chơi đã kết nối',
      'POST /api/results': 'User gửi kết quả game (kèm french, vietnam, unassigned)',
      'GET /api/results': 'Lấy tất cả kết quả game',
      'GET /api/health': 'Kiểm tra trạng thái server'
    }
  });
});

// Khởi động server
app.listen(PORT, () => {
  console.log(`🟢 Backend đang chạy tại port ${PORT}`);
  console.log(`📝 API endpoints:`);
  console.log(`   POST /api/game/start`);
  console.log(`   POST /api/game/end`);
  console.log(`   GET  /api/game/status`);
  console.log(`   POST /api/player/connect`);
  console.log(`   GET  /api/players/connected`);
  console.log(`   POST /api/results`);
  console.log(`   GET  /api/results`);
});