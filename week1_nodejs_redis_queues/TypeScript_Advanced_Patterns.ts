/**
 * 1. Generics (Kiểu dữ liệu chung)
 * Cho phép tạo ra các thành phần (hàm, lớp, interface) có thể làm việc với nhiều kiểu dữ liệu khác nhau
 * mà vẫn giữ được tính an toàn kiểu (type safety).
 */

// Hàm generic cơ bản
function identity<T>(arg: T): T {
    return arg;
}

const stringResult = identity<string>("Hello Generics");
console.log("Kiểu dữ liệu: ",typeof stringResult);

const numberResult = identity<number>(42);
console.log("Kiểu dữ liệu: ", typeof numberResult);


// Generic với Array
function getFirstElement<T>(arr: T[]): T | undefined {
    return arr.length > 0 ? arr[0] : undefined;
}
const firstNum = getFirstElement([1, 2, 3]);
console.log("Kiểu dữ liệu: ", typeof firstNum);

const firstStr = getFirstElement(["a", "b"]);
console.log("Kiểu dữ liệu: ", typeof firstStr);

// Generic Interface
interface KeyValuePair<K, V> {
    key: K;
    value: V;
}
const kv1: KeyValuePair<string, number> = { key: "age", value: 30 };
const kv2: KeyValuePair<number, boolean> = { key: 1, value: true };


/**
 * 2. Discriminated Unions (Union phân biệt)
 * Là một pattern kết hợp Union Types và Type Guards.
 * Yêu cầu có một trường chung (thường gọi là 'type' hoặc 'kind') để phân biệt giữa các object trong Union.
 */

interface Circle {
    kind: "circle"; // Discriminator (Trường phân biệt)
    radius: number;
}

interface Square {
    kind: "square"; // Discriminator
    sideLength: number;
}

interface Rectangle {
    kind: "rectangle"; // Discriminator
    width: number;
    height: number;
}

// Shape có thể là 1 trong 3 hình trên
type Shape = Circle | Square | Rectangle;


/**
 * 3. Type Guards (Bảo vệ kiểu)
 * Là các kỹ thuật để thu hẹp (narrow) kiểu dữ liệu của một biến trong một khối lệnh cụ thể.
 */

// Ví dụ 1: Type Guard với 'typeof'
function printId(id: number | string) {
    if (typeof id === "string") {
        // Trong khối 'if' này, TypeScript hiểu chắc chắn 'id' là string
        console.log(id.toUpperCase());
    } else {
        // Trong khối 'else' này, TypeScript hiểu chắc chắn 'id' là number
        console.log(id * 2);
    }
}

// Ví dụ 2: Type Guard kết hợp với Discriminated Unions (sử dụng 'switch' hoặc 'if')
function getArea(shape: Shape): number {
    switch (shape.kind) {
        case "circle":
            // TypeScript hiểu 'shape' là Circle nên mới gọi được .radius
            return Math.PI * shape.radius ** 2;
        case "square":
            // TypeScript hiểu 'shape' là Square
            return shape.sideLength ** 2;
        case "rectangle":
            // TypeScript hiểu 'shape' là Rectangle
            return shape.width * shape.height;
        default:
            // Đảm bảo chúng ta đã xử lý tất cả các 'kind' có thể xảy ra (Exhaustiveness checking)
            // Nếu ta thêm 'Triangle' vào 'Shape' mà quên cập nhật switch case, dòng này sẽ báo lỗi
            const _exhaustiveCheck: never = shape;
            return _exhaustiveCheck;
    }
}

// Ví dụ 3: Custom Type Guard function (Hàm bảo vệ kiểu tự định nghĩa)
// Sử dụng cú pháp 'pet is Fish' làm kiểu trả về (Type Predicate)
interface Fish { swim: () => void; }
interface Bird { fly: () => void; }

function isFish(pet: Fish | Bird): pet is Fish {
    return (pet as Fish).swim !== undefined;
}

function movePet(pet: Fish | Bird) {
    if (isFish(pet)) {
        pet.swim(); // TypeScript biết pet là Fish
    } else {
        pet.fly(); // TypeScript biết pet là Bird
    }
}


/**
 * 4. Conditional Types (Kiểu điều kiện)
 * Giống như câu lệnh if-else nhưng áp dụng cho hệ thống Type của TypeScript.
 * Cú pháp: T extends U ? X : Y
 */

type IsString<T> = T extends string ? "Yes" : "No";

type Test1 = IsString<string>;  // Type của Test1 là "Yes"
type Test2 = IsString<number>;  // Type của Test2 là "No"

// Ứng dụng thực tế: Loại bỏ null và undefined từ một kiểu
// (Đây chính là cách utility type NonNullable tích hợp sẵn của TS hoạt động)
type MyNonNullable<T> = T extends null | undefined ? never : T;

type StrOrNull = string | null;
type JustStr = MyNonNullable<StrOrNull>; // Type của JustStr giờ chỉ còn là string


/**
 * 5. Thực hành tổng hợp: Xây dựng Type-safe Utility function và Conditional Types
 * Ví dụ: Xây dựng kiểu cho API Response và hàm xử lý an toàn
 */

// Định nghĩa các trạng thái response bằng Discriminated Unions
interface SuccessResponse<T> {
    status: "success";
    data: T;
}

interface ErrorResponse {
    status: "error";
    error: string;
}

// Type chung cho API Response
type ApiResponse<T> = SuccessResponse<T> | ErrorResponse;

// Conditional type sử dụng từ khóa 'infer' để bóc tách (extract) kiểu Data từ một SuccessResponse
// Nếu R là một SuccessResponse chứa data kiểu D, trả về D, ngược lại trả về never
type ExtractData<R> = R extends SuccessResponse<infer D> ? D : never;

// --- Thử nghiệm ---
type User = { id: number; name: string };
type FetchUserResponse = ApiResponse<User>;

// Sử dụng Conditional Type để lấy ra kiểu User
type ExtractedUser = ExtractData<FetchUserResponse>; // type ExtractedUser = User

// Hàm tiện ích type-safe để xử lý response
function handleApiResponse<T>(response: ApiResponse<T>) {
    // Sử dụng Type Guard để kiểm tra trạng thái
    if (response.status === "success") {
        // TypeScript hiểu response là SuccessResponse<T>
        console.log("Dữ liệu nhận được:", response.data);
        return response.data;
    } else {
        // TypeScript hiểu response là ErrorResponse
        console.error("Lỗi:", response.error);
        return null;
    }
}

// Chạy thử hàm handleApiResponse
const successRes: ApiResponse<User> = {
    status: "success",
    data: { id: 1, name: "Alice" }
};

const errorRes: ApiResponse<User> = {
    status: "error",
    error: "Không tìm thấy user"
};

console.log("--- Xử lý API Response ---");
handleApiResponse(successRes); // Sẽ in ra dữ liệu
handleApiResponse(errorRes);   // Sẽ in ra lỗi
