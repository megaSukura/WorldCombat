/**
 * 跃起 / splash —— 执行组织（自管节奏）。
 *
 * 核心念头：沿选定的方向一蹦——蹲身、弹起一小段抛物线、落地；什么都不会发生。没有伤害、没有状态、
 *   不碰任何人，世界只多了一段位移。这一跳能越过一道坎、把自己挪出直线攻击的落点、或者只是换个窝。
 *
 * 两幕半（本招自己驱动）：
 *   蹲（提交前）：压低身子蓄力，只播预告；起手极短。起跳要求脚下有实地或合适水面。
 *   蹦（提交后）：按活体实际重力属性与原生阻力预估竖直初速与水平初速（方向由选定的落点决定），
 *     交给原生物理走完这段抛物线；空中每一刻续播尾迹（按起跳处是水还是地选水尾/尘尾），
 *     直到身体真的重新落地。
 *   落（实际落地）：按落地处是水是地分别溅起水花或尘点，浮一行「什么都没发生」，收招后结束。
 *
 * 安全上限到时若仍在空中，只收掉空中尾迹并结束，绝不假装落地；取消时也由原生物理自然落下。
 * 它不读目标、不改别人的任何东西；射程与落点由玩家选（kind motion），AI 沿弧净空并挑有支撑的落点。
 */
namespace PokemonSkills {
    function splashAbove(point: CombatPoint): CombatPoint { return point.plus(WorldCombat.point(0, 0.9, 0)); }
    /** 活体实际重力属性（找不到时退回原版 0.08）。 */
    function splashGravity(world: CombatWorld, actor: CombatActor): number {
        const attribute = world.attributeValue(actor, "minecraft:generic.gravity");
        const value = attribute === null ? NaN : attribute.value();
        return isFinite(value) && value > 0 ? value : 0.08;
    }
    /** 用实际重力与原生阻力离散估算竖直初速与滞空：找到能弹到目标高度的最小初速，再读它回落到地面的刻数。 */
    function splashArc(gravity: number, target: number, drag: number): { vy: number; air: number } {
        function flight(vy: number): { apex: number; air: number } {
            let v = vy, y = 0, apex = 0, ticks = 0;
            for (let i = 0; i < 240; i++) {
                v = (v - gravity) * drag;
                y += v;
                ticks++;
                if (y > apex) apex = y;
                if (y <= 0 && v < 0) break;
            }
            return { apex: apex, air: ticks };
        }
        let low = 0.01, high = 4;
        for (let i = 0; i < 30; i++) {
            const middle = (low + high) / 2;
            if (flight(middle).apex < target) low = middle; else high = middle;
        }
        return { vy: high, air: flight(high).air };
    }

    define({
        freeMovement: true,
        id: splashId,
        cooldownParameter: "recharge",
        name: "跃起",
        description: "沿选定方向一蹦：蹲身、弹起一小段抛物线、落地——什么都不会发生，不伤害也不影响任何人。可以在实地或有水面的地方起跳，越过一道坎，或把自己挪出攻击的落点。它是唯一只动自己的招。",
        uses: ["越过一道坎或一小段水面", "把自己挪出直线招式的落点", "低而远地换位拉距离"],
        kind: "motion",
        range: 3,
        maxRange: 5,
        prepare: 4,
        active: 0,
        recover: 5,
        cooldown: 30,
        style: "splash",
        maximumTicks: 120,
        interruptible: false,
        defaults: { leap: false, ai: { maxChase: 14, retreatBelow: 0.5, keepAway: 4 } },
        fields: [flag("leap", "高跃")],
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills[splashId], detail: { values: config }, world: world || null, actor: actor || null, attributes };
            const leap = !!(config && config.leap);
            return {
                prepare: Math.max(2, Math.round(p(splashId, "tempo", context)) + (leap ? 1 : 0)),
                recover: Math.round(p(splashId, "aftercast", context)),
                cooldown: Math.round(p(splashId, "recharge", context)),
                active: 0,
                range: p(splashId, "hopRange", context)
            };
        },
        indicator: function (config, pokemon) {
            const context: NumberContext = { pokemon: pokemon!, skill: skills[splashId], detail: { values: config } };
            return { radius: p(splashId, "hopRange", context), geometry: "line", style: "splash", color: 0x9FD4FF,
                label: config && config.leap === true ? "跃起 · 高跃" : "跃起" };
        },
        run: function (action, _move, config) {
            const leap = !!(config && config.leap);
            const actor = action.actor();
            const seen = action.sense().observe(actor);
            const origin = seen === null ? action.origin() : seen.position();
            const height = p(splashId, "hopHeight", action);
            const range = Math.max(0.6, p(splashId, "hopRange", action));
            const hang = Math.max(6, Math.round(p(splashId, "hangTicks", action)));
            const motes = Math.max(8, Math.round(p(splashId, "splashMotes", action)));
            const recover = Math.max(1, Math.round(p(splashId, "aftercast", action)));
            const cooldown = Math.round(p(splashId, "recharge", action));
            const prepare = Math.max(2, Math.round(p(splashId, "tempo", action)) + (leap ? 1 : 0));
            const chosen = action.targetPosition();
            const flat = WorldCombat.point(chosen.x() - origin.x(), 0, chosen.z() - origin.z());
            const distance = flat.length() < 0.05 ? range : Math.min(range, flat.length());
            const direction = flat.length() < 0.05 ? WorldCombat.point(action.direction().x(), 0, action.direction().z()).unit() : flat.unit();

            action.present("world_combat:move_splash:crouch", splashScene, 1, origin,
                JSON.stringify({ moment: "crouch", leap: leap ? 1 : 0, height: height, range: range }));
            action.after(prepare, function (current: CombatAction) {
                // 起跳要求实地或合适水面；没有实际支撑时直接拒绝，不伪造一次起跳。
                const standing = current.sense().observe(actor);
                if (standing === null) { current.finish(); return; }
                if (!standing.grounded() && !standing.wet()) { current.reject("no-footing"); return; }
                current.commit(cooldown);
                const world = current.world(), body = world.observe(actor);
                if (body === null) { current.finish(); return; }
                const scenes = WorldFeedback.actionScenes(splashScene);
                const start = body.position();
                const fromWater = body.wet();
                current.face(start.plus(direction.scale(2)), 15, 15);
                // 按实际重力与原生阻力（空气竖直 ×0.98、水平 ×0.91）预估初速，交给原生物理走完抛物线。
                const gravity = splashGravity(world, actor);
                const arc = splashArc(gravity, height, 0.98);
                const air = Math.max(hang, arc.air);
                const horizontalDrag = 0.91;
                const speed = Math.min(0.45, distance * (1 - horizontalDrag) / Math.max(1e-6, 1 - Math.pow(horizontalDrag, air)));
                world.motion(actor, WorldCombat.point(direction.x() * speed, arc.vy, direction.z() * speed), false);
                scenes.show(current, "hop", start,
                    { moment: fromWater ? "hop" : "hop_dust", target: String(actor.ref()), motes: motes, height: height, leap: leap ? 1 : 0,
                        distance: distance, direction: [direction.x(), direction.y(), direction.z()] });
                world.sound(fromWater ? "minecraft:entity.axolotl.splash" : "minecraft:entity.rabbit.jump", start, 12, "{}");

                let airborne = false, age = 0;
                const safety = air + 40;

                function land(current: CombatAction, at: CombatPoint): void {
                    scenes.stop(current);
                    const live = current.world(), self = live.observe(actor);
                    const water = self !== null && self.wet();
                    const intensity = Math.max(0.6, Math.min(1.8, motes / 20));
                    WorldFeedback.emit(live, splashScene, 1, at,
                        { moment: water ? "land" : "dust", motes: motes, height: height, leap: leap ? 1 : 0,
                            water: water ? 1 : 0, intensity: intensity }, 22);
                    WorldFeedback.text(live, splashAbove(at), splashNothingText, [], 30);
                    live.sound(water ? "minecraft:entity.dolphin.splash" : "minecraft:block.grass.break", at, 12, "{}");
                    current.after(Math.max(1, recover), function (next: CombatAction) { next.finish(); });
                }

                function watch(current: CombatAction): void {
                    const live = current.world(), self = live.observe(actor);
                    if (self === null) { scenes.stop(current); current.finish(); return; }
                    const at = self.position();
                    if (!airborne && (!self.grounded() || at.y() > start.y() + 0.1)) airborne = true;
                    if (airborne && self.grounded()) { land(current, at); return; }
                    // 安全上限到时仍在空中：只收空中尾迹结束，不播落地水花/尘。
                    if (++age >= safety) { scenes.stop(current); current.finish(); return; }
                    scenes.show(current, "hop", at,
                        { moment: fromWater ? "hop" : "hop_dust", target: String(actor.ref()), motes: motes, height: height, leap: leap ? 1 : 0,
                            distance: distance, direction: [direction.x(), direction.y(), direction.z()] });
                    current.after(1, watch);
                }
                current.after(1, watch);
            });
        }
    });
}
