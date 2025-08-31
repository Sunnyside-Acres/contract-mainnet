# Khắc phục Hydration Mismatch

## Vấn đề đã được khắc phục

### 1. Sử dụng `typeof window` trong SSR

**Vấn đề**: Kiểm tra `typeof window !== 'undefined'` trong server-side rendering gây ra hydration mismatch.

**Giải pháp**:

- Sử dụng `useState` và `useEffect` để kiểm tra client-side
- Tạo state `isClient` để đảm bảo code chỉ chạy sau khi mount

```tsx
const [isClient, setIsClient] = useState(false);

useEffect(() => {
  setIsClient(true);
}, []);

// Sử dụng isClient thay vì typeof window
if (isClient && window.ethereum) {
  // Client-side code
}
```

### 2. Sử dụng `Math.random()` và `Date.now()`

**Vấn đề**: Các hàm này trả về giá trị khác nhau giữa server và client.

**Giải pháp**:

- Sử dụng `useMemo` với dependency array rỗng
- Tạo hook `useRandomAddress()` cho địa chỉ ngẫu nhiên
- Tạo hook `useCurrentTime()` cho thời gian hiện tại

```tsx
const useRandomAddress = () => {
  return React.useMemo(() => {
    return (
      "0x" +
      Array.from({ length: 40 }, () =>
        Math.floor(Math.random() * 16).toString(16)
      ).join("")
    );
  }, []);
};
```

### 3. Sử dụng `toLocaleString()` với locale

**Vấn đề**: Locale có thể khác nhau giữa server và client.

**Giải pháp**:

- Tạo hook `useLocale()` để xử lý formatting
- Chỉ format sau khi client đã mount

```tsx
const { formatNumber, formatDate, isClient } = useLocale();

// Sử dụng
{
  isClient ? formatNumber(value) : value.toString();
}
```

### 4. SidebarMenuSkeleton với width ngẫu nhiên

**Vấn đề**: Width ngẫu nhiên gây ra layout khác nhau giữa server và client.

**Giải pháp**:

- Sử dụng width cố định thay vì ngẫu nhiên
- Hoặc sử dụng `useMemo` với dependency array rỗng

```tsx
const width = React.useMemo(() => {
  return "70%"; // Fixed width
}, []);
```

## Components đã được sửa

1. **WalletContext.tsx** - Thêm `isClient` state
2. **WalletSelector.tsx** - Sử dụng `isClient` thay vì `typeof window`
3. **WalletAutoConnect.tsx** - Sử dụng `isClient` thay vì `typeof window`
4. **WalletConnect.tsx** - Sử dụng `isClient` thay vì `typeof window`
5. **app-sidebar.tsx** - Loại bỏ `typeof window`
6. **use-mobile.tsx** - Sửa state mặc định
7. **sidebar.tsx** - Sử dụng width cố định
8. **deploy/page.tsx** - Sử dụng `useRandomAddress` hook
9. **PlotManager.tsx** - Sử dụng `useCurrentTime` hook
10. **layout.tsx** - Thêm metadata trong head

## Hooks mới được tạo

1. **useLocale.tsx** - Xử lý locale formatting
2. **NoSSR.tsx** - Component wrapper cho client-only content

## Cách kiểm tra

1. Chạy development server: `npm run dev`
2. Mở browser developer tools
3. Kiểm tra console có lỗi hydration mismatch không
4. Test các tính năng wallet connection
5. Test các tính năng hiển thị thời gian và số liệu

## Lưu ý

- Tất cả các component sử dụng browser APIs phải được wrap trong `useEffect`
- Sử dụng `NoSSR` component cho content chỉ hiển thị ở client
- Tránh sử dụng `Math.random()`, `Date.now()` trực tiếp trong render
- Luôn có fallback cho server-side rendering
