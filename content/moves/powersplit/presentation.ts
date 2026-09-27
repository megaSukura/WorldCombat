WorldCombatClient.scene("world_combat:move_powersplit", 1, frame => {
    const entry: CombatSceneEntry<any> = JSON.parse(frame.data()), data = entry.data || {};
    if (entry.lifecycle || data.lifecycle || !Array.isArray(data.actors)) return;
    const anchors = data.actors.map((ref: string) => JSON.parse(frame.anchor(ref)));
    if (!anchors[0] || !anchors[1]) return;
    const points = anchors.map((body: any) => [body.x, body.y + body.height * .65, body.z]);
    const a = points[0], b = points[1], time = frame.serverTick() + frame.partialTick();
    if (data.moment === "prepare") {
        const progress = Math.max(0, Math.min(1, (time - data.start) / Math.max(1, data.duration)));
        const mid = [(a[0] + b[0]) * .5, (a[1] + b[1]) * .5, (a[2] + b[2]) * .5];
        [a, b].forEach(point => frame.line(point[0], point[1], point[2], point[0] + (mid[0] - point[0]) * progress,
            point[1] + (mid[1] - point[1]) * progress, point[2] + (mid[2] - point[2]) * progress, (150 << 24) | 0xFFB060));
    } else if (data.moment === "link") {
        frame.line(a[0], a[1], a[2], b[0], b[1], b[2], (65 << 24) | 0xFFB060);
        for (let side = 0; side < 2; side++) {
            const point = points[side], amount = Number(data.credit && data.credit[side] || 0);
            if (amount > 0) {
                frame.sprite("cobblemon:particle/generic/orb/energyorb", point[0], point[1] + .25, point[2], .3, 0, (240 << 24) | 0xFFF0DC, 0, true);
                frame.billboard(data.actors[side], anchors[side].height + .15, 24, surface =>
                    surface.text("+" + (Math.round(amount * 10) / 10), 0, 0, 0xFFFFC985, 100));
            } else if (!data.given[side]) {
                frame.sprite("cobblemon:particle/generic/orb/energyorb", point[0], point[1] + .25, point[2], .18, 0, (130 << 24) | 0xFFB060, 0, true);
            }
        }
    } else if (data.moment === "gift") {
        const progress = Math.max(0, Math.min(1, (time - data.start) / Math.max(1, data.duration)));
        frame.line(a[0], a[1], a[2], b[0], b[1], b[2], (Math.round(230 * (1 - progress)) << 24) | 0xFFF0DC);
        frame.sprite("cobblemon:particle/generic/orb/energyorb", b[0], b[1] + .25, b[2], .25 + progress * .2,
            0, (Math.round(230 * (1 - progress)) << 24) | 0xFFB060, 0, true);
    }
});