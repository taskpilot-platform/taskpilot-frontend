import { Button } from "@/components/ui/button"
import { ThemeSelector } from "@/components/theme-selector"
// Import CSS bắt buộc
import 'react-toastify/dist/ReactToastify.css';
import { ToastContainer, toast } from 'react-toastify';

function App() {
  const handleShowToast = () => {
    // Gọi thông báo với theme "colored"
    toast.success('TaskPilot đã sẵn sàng!', {
      position: "top-right",
      autoClose: 5000,
      hideProgressBar: false,
      closeOnClick: true,
      pauseOnHover: true,
      draggable: true,
      progress: undefined,
      theme: "colored", // <--- Quan trọng: Cái này làm nó full màu xanh/đỏ
    });
    
    toast.error('Cảnh báo lỗi nè!', {
      theme: "colored", // Ra màu đỏ chót
    });
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-6 bg-background text-foreground"> 
      
      {/* Cấu hình ToastContainer */}
      <ToastContainer />

      <div className="text-center space-y-2">
        <h1 className="text-4xl font-extrabold text-primary">TaskPilot Project</h1>
        <p className="text-muted-foreground">Hệ thống Multi-theme với Shadcn UI</p>
      </div>

      {/* Bộ chọn Theme */}
      <div className="p-6 rounded-lg border bg-card text-card-foreground shadow-sm">
        <ThemeSelector />
      </div>
      
      {/* Demo Button dùng màu primary */}
      <div className="flex gap-3">
        <Button onClick={handleShowToast} className="shadow-lg">
          Test React Toastify
        </Button>
        <Button variant="secondary">Secondary</Button>
        <Button variant="outline">Outline</Button>
        <Button variant="destructive">Destructive</Button>
      </div>
    </div>
  )
}

export default App