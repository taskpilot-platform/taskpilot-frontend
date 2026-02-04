import { Button } from "@/components/ui/button"

function App() {
  return (
    <div className="flex flex-col items-center justify-center h-screen gap-4">
      <h1 className="text-3xl font-bold text-blue-600">
        TaskPilot Project
      </h1>
      <p className="text-gray-500">
        Setup thành công Frontend + Shadcn UI!
      </p>
      
      {/* Đây là Button của Shadcn */}
      <Button onClick={() => alert("Đã click!")}>
        Click thử tui đi
      </Button>
    </div>
  )
}

export default App