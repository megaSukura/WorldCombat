WorldCombatClient.scene("world_combat:move_coil", 1, frame => {
    const entry: CombatSceneEntry<any> = JSON.parse(frame.data()), data = entry.data || {};
    if (entry.lifecycle || data.lifecycle) return;
    const actor = JSON.parse(frame.anchor(data.actor || entry.source));
    const tick = frame.serverTick() + frame.partialTick();
    const progress = Math.max(0, Math.min(1, (tick - Number(data.start || 0)) / Math.max(1, Number(data.duration || 1))));
    const violet = 0x8A6FD8, pale = 0xE6DEFF;
    if (data.moment === "prepare" && actor) {
        const radius = Math.max(.2, actor.width * .65) * (1 - .4 * progress), height = actor.height * (.6 - .35 * progress);
        let previous: number[] | null = null;
        for (let i = 0; i <= 60; i++) {
            const u = i / 60, angle = u * Math.PI * 6;
            const point = [actor.x + Math.cos(angle) * radius * (1 - u * .25), actor.y + .08 + height * u,
                actor.z + Math.sin(angle) * radius * (1 - u * .25)];
            if (previous) frame.line(previous[0], previous[1], previous[2], point[0], point[1], point[2], (210 << 24) | violet);
            previous = point;
        }
        return;
    }
    if ((data.moment === "spring" || data.moment === "trail") && Array.isArray(data.path)) {
        const alpha = data.moment === "trail" ? Math.round(180 * (1 - progress)) : 180;
        for (let i = 1; i < data.path.length; i++) {
            const a = data.path[i - 1], b = data.path[i];
            frame.line(a[0], a[1], a[2], b[0], b[1], b[2], (alpha << 24) | violet);
        }
    }
    if (data.moment === "armed" && actor) {
        const yaw = Number(actor.bodyYaw || actor.yaw || 0) * Math.PI / 180;
        const x = actor.x - Math.sin(yaw) * actor.width * .55, y = actor.y + actor.height * .62, z = actor.z + Math.cos(yaw) * actor.width * .55;
        frame.sprite("cobblemon:particle/generic/psychic/psyring1", x, y, z, .24 + (data.factor - 1) * .16, 0, (230 << 24) | pale, 0, true);
    }
    if (data.moment === "spend" && actor) {
        const y = actor.y + actor.height * .6;
        for (let i = 0; i < 5; i++) {
            const angle = i * Math.PI * 2 / 5, r = .16 + progress * .35;
            frame.line(actor.x, y, actor.z, actor.x + Math.cos(angle) * r, y + .12 * progress, actor.z + Math.sin(angle) * r,
                (Math.round(220 * (1 - progress)) << 24) | pale);
        }
    }
});