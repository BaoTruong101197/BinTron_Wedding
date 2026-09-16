Đặt video kỉ niệm thật vào đây, rồi điền đường dẫn tương ứng vào `js/config.js` (`CONFIG.memories[i].videos`), ví dụ:

```
assets/media/memory-1.mp4
```

Mỗi kỉ niệm có thể có nhiều video (mảng `videos` nhiều phần tử) - các video sẽ tự phát lần lượt, xong cái này mới sang cái tiếp theo. Phần tử nào để `null` sẽ tự hiển thị khung placeholder gradient thay thế (coi như "phát xong" sau một khoảng thời gian giả lập, xem `CONFIG.timing.memoryPlaceholderDuration`).
