/**
 * 跃起 / splash —— 执行组织（自管节奏）。
 *
 * 核心念头：沿选定的方向一蹦——蹲身、弹起一小段抛物线、落地；什么都不会发生。没有伤害、没有状态、
 *   不碰任何人，世界只多了一段位移。这一跳能越过一道坎、把自己挪出直线攻击的落点、或者只是换个窝。
 *
 * 两幕半（本招自己驱动）：
 *   蹲（提交前）：压低身子蓄力，只播预告；起手极短。
 *   蹦（提交后）：按 hopHeight 给一个向上的初速、按 hopRange 给水平初速（方向由选定的落点决定），
 *     交给原生物理走完这段抛物线；空中每刻沿线续播水花。
 *   落（落地）：溅起 splashMotes 点水花，浮一行「什么都没发生」，收招后结束。
 *
 * 它不读目标、不改别人的任何东西；射程与落点由玩家选（kind motion），AI 选朝向或背离威胁的点。
 */
namespace PokemonSkills {
    function splashAbove(point: CombatPoint): CombatPoint { return point.plus(WorldCombat.point(0, 0.9, 0)); }

    function splashLand(current: CombatAction, motes: number, height: number, leap: boolean, recover: number): void {
        const world = current.world(), actor = current.actor(), body = world.observe(actor);
        if (body === null) { current.finish(); return; }
        const at = body.position();
        WorldFeedback.emit(world, splashScene, 1, at,
            { moment: "land", motes: motes, height: height, leap: leap ? 1 : 0,
                intensity: Math.max(0.6, Math.min(1.8, motes / 20)) }, 22);
        WorldFeedback.text(world, splashAbove(at), splashNothingText, [], 30);
        world.sound("minecraft:entity.dolphin.splash", at, 12, "{}");
        current.after(Math.max(1, recover), function (next: CombatAction) { next.finish(); });
    }

    function splashSettle(current: CombatAction, remaining: number, motes: number, height: number, leap: boolean,
                          recover: number, direction: CombatPoint): void {
        const world = current.world(), actor = current.actor(), body = world.observe(actor);
        if (body === null) { current.finish(); return; }
        if (remaining <= 0) { splashLand(current, motes, height, leap, recover); return; }
        WorldFeedback.keep(world, "world_combat:move_splash:hop/" + String(actor.ref()), splashScene, 1, body.position(),
            { moment: "hop", target: String(actor.ref()), motes: motes, height: height, leap: leap ? 1 : 0,
                direction: [direction.x(), direction.y(), direction.z()] }, 6);
        current.after(1, function (next: CombatAction) { splashSettle(next, remaining - 1, motes, height, leap, recover, direction); });
    }

    define({
        id: splashId,
        name: "跃起",
        description: "沿选定方向一蹦：蹲身、弹起一小段抛物线、落地——什么都不会发生，不伤害也不影响任何人。可以越过一道坎，或把自己挪出攻击的落点；高跃式跳得更高但更近。",
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
                current.commit(cooldown);
                const world = current.world(), body = world.observe(actor);
                if (body === null) { current.finish(); return; }
                current.face(body.position().plus(direction.scale(2)), 15, 15);
                // 一次给足初速，之后交给原生物理：竖直初速按目标高度算，水平初速把落点铺到选定的距离。
                const gravity = 0.08;
                const vy = Math.sqrt(Math.max(0.02, 2 * gravity * height));
                const air = Math.max(hang, Math.round(2 * vy / gravity));
                const speed = Math.min(0.45, distance / air);
                world.motion(actor, WorldCombat.point(direction.x() * speed, vy, direction.z() * speed), false);
                WorldFeedback.emit(world, splashScene, 1, body.position(),
                    { moment: "hop", target: String(actor.ref()), motes: motes, height: height, leap: leap ? 1 : 0,
                        distance: distance, direction: [direction.x(), direction.y(), direction.z()] }, 20);
                world.sound("minecraft:entity.axolotl.splash", body.position(), 12, "{}");
                splashSettle(current, air, motes, height, leap, recover, direction);
            });
        }
    });
}
