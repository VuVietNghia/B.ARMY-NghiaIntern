// Một hàm thông thường
function tinhThuong() {
  return "Hello";
}

// Một hàm async
async function tinhAsync() {
  return typeof "Hello";
}

console.log(tinhThuong()); // Kết quả: "Hello"
console.log(tinhAsync());  // Kết quả: Promise { <fulfilled>: "Hello" }

