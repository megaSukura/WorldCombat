/**
 * 恶魔之吻 / lovelykiss —— 执行组织。
 *
 * 核心念头：先摆出一张恐怖的脸，再贴地猛扑到对方脸上强吻下去。它不隔空——**用身体去换**：把自己送到
 *   近身、暴露出来，扑到就几乎必中，把对方当场吓睡；扑空就白白贴上去挨打。唯一能溜掉的是比它更快、
 *   更灵活的目标。
 *
 * 三幕：
 *   起（windup，提交前）：恐怖的脸在脸前亮起，只播预告。
 *   扑（pounce，提交后）：沿「自身→目标」的直线贴地连续突进，最多 pounce 格；中途撞墙或目标跑出预算就扑空。
 *   吻（kiss / miss / immune）：进入判定半径后掷一次扑中概率（目标速度压过自身速度时才可能扭开）；中则挂
 *     共享身份 world_combat:status/sleep，睡着的余韵由绑定效果 world_combat:lovelykiss_trance 续着；扭开则只落一撮心与烟。
 *
 * 反制：比它更快就能扭开这一吻；在它扑上来之前拉开距离，或让它撞墙。
 */
namespace PokemonSkills {
    function lovelykissAbove(point: CombatPoint): CombatPoint { return point.plus(WorldCombat.point(0, 0.9, 0)); }

    // 睡意余韵：跟着睡者的绑定效果，每 20 刻续一次头顶的 Z 与收拢的余韵环。
    WorldCombat.effect(lovelykissTrance, 1, 1200, "actor", function (json) {
        const value = JSON.parse(json || "{}");
        if (typeof value.total !== "number" || !isFinite(value.total) || value.total < 1) throw new Error("Invalid lovelykiss trance: total");
        if (typeof value.hearts !== "number" || !isFinite(value.hearts)) throw new Error("Invalid lovelykiss trance: hearts");
        return JSON.stringify(value);
    }, EffectProtocols.unchanged);
    WorldCombat.effectHandler(lovelykissTrance, "start", function (effect) { effect.schedule("tick", "tick", 1, "{}"); });
    WorldCombat.effectHandler(lovelykissTrance, "operation:world_combat:dispel", function (effect) { effect.end(); });
    WorldCombat.effectHandler(lovelykissTrance, "tick", function (effect) {
        const world = effect.world(), actor = effect.target();
        if (!world.valid(actor) || !CombatStatus.has(world, actor, "sleep")) { effect.end(); return; }
        const body = world.observe(actor);
        if (body === null) { effect.end(); return; }
        const data = JSON.parse(effect.state());
        const remain = Math.max(0, effect.remaining());
        const ratio = data.total > 0 ? Math.max(0, Math.min(1, remain / data.total)) : 0;
        WorldFeedback.keep(world, "lovelykiss:" + String(actor.ref()), lovelykissScene, 1, body.position(),
            { moment: "linger", target: String(actor.ref()), remain: remain, total: data.total,
              ringRadius: Math.round((0.2 + 0.75 * ratio) * 100) / 100 }, 30);
        effect.schedule("tick", "tick", 20, "{}");
    });

    define({
        id: lovelykissId,
        cooldownParameter: "recharge",
        name: "恶魔之吻",
        description: "摆出恐怖的脸贴地猛扑过去强吻对手。它必须先把身体送到对方脸上，扑到就几乎必然把它吓睡；只有比施法者更快、更灵活的目标能扭开这一吻。",
        uses: ["惩罚站桩或慢慢转头的目标", "用一次突进把近身的威胁睡下", "在开阔地追上落单的敌人"],
        kind: "enemy",
        range: 4,
        maxRange: 8,
        prepare: 9,
        active: 1,
        recover: 9,
        cooldown: 90,
        maximumTicks: 80,
        style: "kiss",
        defaults: { leap: false },
        fields: [
            field(pathOf("leap"), "凌空扑吻", "boolean", {
                help: "开启：扑击距离 ×1.35、速度 ×1.25、冷却 ×0.9，但睡眠 ×0.85，用来追上跑者、快进快出；关闭（重吻）：睡眠 ×1.25、冷却 ×1.15、扑击距离 ×0.85、起手 +3 刻，用来贴上去把人睡死。"
            })
        ],
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills[lovelykissId], detail: { values: config }, world, actor, attributes };
            return {
                prepare: Math.round(p(lovelykissId, "tempo", context)),
                recover: Math.round(p(lovelykissId, "aftercast", context)),
                cooldown: Math.round(p(lovelykissId, "recharge", context)),
                active: 1,
                range: p(lovelykissId, "pounce", context) + p(lovelykissId, "kissRadius", context)
            };
        },
        ready: function (action) {
            const world = action.sense(), target = action.target();
            if (target === null || !world.valid(target) || world.friendly(target)) return "invalid-target";
            const body = world.observe(target);
            if (body === null) return "target-left";
            if (CombatStatus.has(world, target, "sleep")) return "already-asleep";
            return body.position().minus(action.origin()).length() > action.range() + 0.6 ? "out-of-range" : "";
        },
        windup: function (action, config, prepare) {
            action.present("lovelykiss:windup:" + action.id(), lovelykissScene, 1, action.origin(),
                JSON.stringify({ moment: "windup", leap: config && config.leap === true,
                    target: action.target() === null ? "" : String(action.target()!.ref()) }));
            return prepare;
        },
        indicator: function (config, pokemon) {
            const context: NumberContext = { pokemon: pokemon!, skill: skills[lovelykissId], detail: { values: config } };
            const reach = pokemon ? p(lovelykissId, "pounce", context) + p(lovelykissId, "kissRadius", context) : 4;
            return { radius: reach, geometry: "circle", style: "kiss", color: 0xB0303A,
                label: config && config.leap === true ? "恶魔之吻·凌空" : "恶魔之吻·重吻" };
        },
        execute: function (action, move, config, done) {
            const world = action.world(), target = action.target();
            const pounce = Math.max(1.5, p(lovelykissId, "pounce", action));
            const speed = Math.max(0.3, p(lovelykissId, "pounceSpeed", action));
            const radius = Math.max(0.25, p(lovelykissId, "kissRadius", action));
            const chance = Math.max(0.05, Math.min(0.98, p(lovelykissId, "landChance", action)));
            const ticks = Math.max(60, Math.round(p(lovelykissId, "sleepTicks", action)));
            const hearts = Math.max(3, Math.round(p(lovelykissId, "hearts", action)));
            const self = world.observe(action.actor());
            if (self === null) { done(action); return; }
            if (target === null || !world.valid(target) || world.friendly(target)) {
                WorldFeedback.emit(world, lovelykissScene, 1, action.targetPosition(), { moment: "fizzle", hearts: hearts }, 16);
                done(action);
                return;
            }
            const victim = target;
            const ref = String(victim.ref());
            let settled = false, travelled = 0;
            function finish(current: CombatAction): void { if (!settled) { settled = true; done(current); } }
            function fizzle(current: CombatAction, point: CombatPoint, label: number): void {
                WorldFeedback.emit(current.world(), lovelykissScene, 1, point, { moment: "fizzle", target: ref, hearts: hearts, travelled: travelled }, 20);
                WorldFeedback.text(current.world(), lovelykissAbove(point), "world_combat.move.lovelykiss.text.fizzle", [label], 24);
                finish(current);
            }
            function kiss(current: CombatAction, at: CombatPoint): void {
                const scope = current.world();
                if (scope.random() >= chance) {
                    WorldFeedback.emit(scope, lovelykissScene, 1, at, { moment: "miss", target: ref, hearts: hearts }, 24);
                    WorldFeedback.text(scope, lovelykissAbove(at), "world_combat.move.lovelykiss.text.miss", [], 26);
                    scope.sound("minecraft:entity.player.attack.sweep", at, 12, "{}");
                    finish(current);
                    return;
                }
                if (!CombatStatus.inflict(scope, victim, "sleep", ticks)) {
                    WorldFeedback.emit(scope, lovelykissScene, 1, at, { moment: "immune", target: ref }, 22);
                    WorldFeedback.text(scope, lovelykissAbove(at), "world_combat.move.lovelykiss.text.immune", [], 26);
                    finish(current);
                    return;
                }
                const existing = scope.effects(victim, lovelykissTrance);
                for (let i = 0; i < existing.length; i++) scope.operation(existing[i].id(), "world_combat:dispel", "{}");
                scope.effect(lovelykissTrance, victim, JSON.stringify({ total: ticks, hearts: hearts }), ticks + 4);
                WorldFeedback.emit(scope, lovelykissScene, 1, at, { moment: "kiss", target: ref, hearts: hearts }, 32);
                WorldFeedback.text(scope, lovelykissAbove(at), "world_combat.move.lovelykiss.text.sleep", [Math.round(ticks / 20)], 32);
                scope.sound("cobblemon:move.lick.target", at, 14, "{}");
                finish(current);
            }
            sound(action, "cobblemon:move.scaryface.actor");
            WorldFeedback.emit(world, lovelykissScene, 1, self.position(),
                { moment: "pounce", path: [String(action.actor().ref()), ref], target: ref, hearts: hearts, pounce: pounce }, 24);
            function step(current: CombatAction): void {
                if (settled) return;
                const scope = current.world();
                const body = scope.observe(current.actor());
                const at = scope.valid(victim) ? scope.observe(victim) : null;
                if (body === null || at === null) { fizzle(current, current.targetPosition(), 0); return; }
                const gap = at.position().minus(body.position()), span = gap.length();
                if (span <= radius + 0.35) { kiss(current, at.position()); return; }
                if (travelled >= pounce) { fizzle(current, at.position(), Math.round(pounce * 10) / 10); return; }
                const horizontal = WorldCombat.point(gap.x(), gap.y() * 0.3, gap.z());
                const direction = horizontal.length() < 0.001 ? current.direction() : horizontal.unit();
                const moved = scope.displace(current.actor(), direction.scale(Math.min(speed, pounce - travelled + 0.4)));
                travelled += moved;
                if (moved < 0.02) { fizzle(current, body.position(), Math.round(travelled * 10) / 10); return; }
                current.after(1, step);
            }
            step(action);
        }
    });
}
