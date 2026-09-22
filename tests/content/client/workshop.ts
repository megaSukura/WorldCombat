namespace WorkshopView {
    WorldCombatClient.scene("p4:field", 1, function (frame) {
        var entry = JSON.parse(frame.data()), p = entry.position, data = entry.data;
        frame.ring(p[0], p[1] + 0.08, p[2], data.radius, (data.charged ? 0xFFFFDD70 : 0xFF65CBF1) | 0);
        frame.ring(p[0], p[1] + 0.09, p[2], 0.18, 0xFFB0EAFF | 0);
    });
    WorldCombatClient.scene("p4:beam", 1, function (frame) {
        var data = JSON.parse(frame.data()).data, a = data.origin, b = data.point;
        frame.line(a[0], a[1], a[2], b[0], b[1], b[2], 0xFFFCE785 | 0);
        for (var i = 0; i < data.arcs.length; i++) { var next = data.arcs[i]; frame.line(b[0], b[1], b[2], next[0], next[1], next[2], 0xFF90E8FF | 0); b = next; }
    });
    WorldCombatClient.scene("p4:echo", 1, function (frame) {
        var entry = JSON.parse(frame.data()), p = entry.position;
        frame.ring(p[0], p[1], p[2], 0.5, 0xFFE7A5F5 | 0);
        frame.ring(p[0], p[1], p[2], 1 + entry.data.phase / 10, 0xFFB991D9 | 0);
        frame.line(p[0], p[1], p[2], p[0], p[1] + 1, p[2], 0xFFE7A5F5 | 0);
    });
    WorldCombatClient.scene("p4:insulation", 1, function (frame) {
        var p = JSON.parse(frame.data()).position; frame.ring(p[0], p[1], p[2], 0.8, 0xFFCBEDA6 | 0);
    });
}
