/**
 * 恶魔之吻 / lovelykiss —— 执行组织。
 *
 * 核心念头：先摆出一张恐怖的脸，再贴地猛扑到对方脸上强吻下去。它不隔空——**用身体去换**：把自己送到
 *   近身、暴露出来，扑到就几乎必中，把对方当场吓睡；扑空就白白贴上去挨打。唯一能溜掉的是比它更快、
 *   更灵活的目标。
 *
 * 三幕：
 *   起（windup，提交前）：恐怖的脸在脸前亮起，只播预告。
 *   扑（pounce，提交后）：沿锁定方向贴地连续突进，用**本体扫掠**走每一段，最多 pounce 格；扫到墙或走完预算
 *     就停在真实位置。
 *   吻（kiss / miss / immune）：扫掠接触到的**第一个敌人**才是这一吻的对象（途中首敌优先，不穿人改选）；
 *     进入接触后掷一次扑中概率（目标速度压过自身速度时才可能扭开）；中则挂共享身份 world_combat:status/sleep，
 *     睡着的余韵由绑定效果 world_combat:lovelykiss_trance 续着；扭开则只落一撮心与烟。未接触到任何人就不下睡。
 *
 * 选取 kind:"aim"：可指定实体，也可朝短方向空扑；空扑与墙挡都可发生。目标为 null 时只扑向落点、收势。
 *
 * 反制：比它更快就能扭开这一吻；在它扑上来之前拉开距离，或让它撞墙。
 */
namespace PokemonSkills {
    function lovelykissAbove(point: CombatPoint): CombatPoint { return point.plus(WorldCombat.point(0, 0.9, 0)); }

    // 睡意余韵：跟着睡者的绑定效果，持续表现随它起落；睡眠不在就收场。
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
        // 持续表现绑定这个托管效果：驱散或睡眠结束时它随效果一起清理。
        WorldFeedback.onEffect(world, effect.id(), "lovelykiss:" + String(actor.ref()), lovelykissScene, 1, body.position(),
            { moment: "linger", target: String(actor.ref()), ringRadius: Math.round((0.2 + 0.75 * ratio) * 100) / 100 });
        effect.schedule("tick", "tick", 20, "{}");
    });

    define({
        freeMovement: true,
        id: lovelykissId,
        cooldownParameter: "recharge",
        name: "恶魔之吻",
        description: "摆出恐怖的脸贴地猛扑过去强吻对手，把对方当场吓睡。它不隔空——必须先把身体送到对方脸上，只有比施法者更快的目标能扭开这一吻；扑空就白白贴上去挨打。途中扫到的第一个敌人就是这一吻的对象，扫到墙或没碰到人就只收势。",
        uses: ["惩罚站桩或慢慢转头的目标", "用一次突进把近身的威胁睡下", "在开阔地追上落单的敌人"],
        kind: "aim",
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
            // 输入辅助目标为 null：朝短方向空扑，扑到谁算谁，没碰到就收势。
            if (target === null) return "";
            if (!world.valid(target) || world.friendly(target)) return "invalid-target";
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
            const scenes = WorldFeedback.actionScenes(lovelykissScene);
            const world = action.world();
            const self = world.observe(action.actor());
            if (self === null) { done(action); return; }
            const pounce = Math.max(1.5, p(lovelykissId, "pounce", action));
            const speed = Math.max(0.3, p(lovelykissId, "pounceSpeed", action));
            const radius = Math.max(0.25, p(lovelykissId, "kissRadius", action));
            const chance = Math.max(0.05, Math.min(0.98, p(lovelykissId, "landChance", action)));
            const ticks = Math.max(60, Math.round(p(lovelykissId, "sleepTicks", action)));
            const hearts = Math.max(3, Math.round(p(lovelykissId, "hearts", action)));
            const scale = Math.max(0.5, Math.min(2.2, radius / 0.45));
            // 扑吻贴地走：方向取水平分量，避免身体贴着地面时被地面挡下。
            const aimed = aim(action);
            const flat = WorldCombat.point(aimed.x(), 0, aimed.z());
            const direction = flat.length() > 0.001 ? flat.unit() : aimed;
            let travelled = 0, settled = false;
            function finish(current: CombatAction): void { if (!settled) { settled = true; scenes.finish(current, done); } }

            /** 扑空／撞墙：停在真实落点收势，画面走 miss/fizzle，不再补睡。 */
            function miss(current: CombatAction, at: CombatPoint): void {
                if (settled) return;
                const scope = current.world(), label = Math.round(travelled * 10) / 10;
                scenes.stop(current);
                WorldFeedback.emit(scope, lovelykissScene, 1, at, { moment: "fizzle" }, 20);
                WorldFeedback.text(scope, lovelykissAbove(at), "world_combat.move.lovelykiss.text.fizzle", [label], 24);
                finish(current);
            }

            /** 身体扫到的第一个敌人：先掷速度对抗，中了才在真实接触点挂睡眠。 */
            function kiss(current: CombatAction, at: CombatPoint, victim: CombatActor): void {
                const scope = current.world(), ref = String(victim.ref());
                scenes.stop(current);
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
                WorldFeedback.emit(scope, lovelykissScene, 1, at, { moment: "kiss", target: ref, hearts: hearts, scale: scale }, 32);
                WorldFeedback.text(scope, lovelykissAbove(at), "world_combat.move.lovelykiss.text.sleep", [Math.round(ticks / 20)], 32);
                scope.sound("cobblemon:move.lick.target", at, 14, "{}");
                finish(current);
            }

            sound(action, "cobblemon:move.scaryface.actor");
            scenes.show(action, "pounce", self.position(), { moment: "pounce", hearts: hearts, scale: scale });

            function advance(current: CombatAction): void {
                if (settled) return;
                const scope = current.world();
                const body = scope.observe(current.actor());
                if (body === null) { miss(current, current.targetPosition()); return; }
                const remaining = pounce - travelled;
                if (remaining <= 0.02) { miss(current, body.position()); return; }
                const step = Math.min(speed, remaining);
                const swept = sweepStep(current, direction.scale(step), radius), hit = swept.hit;
                // 途中首敌优先：moveSweep 在第一个到达的敌人处停下，吻的就是它；友方只触发收势。
                if (hit.hitEntity()) {
                    const victim = hit.target();
                    if (victim !== null && scope.valid(victim) && !scope.friendly(victim)) { kiss(current, hit.position(), victim); return; }
                    miss(current, hit.position());
                    return;
                }
                travelled += swept.moved;
                const after = scope.observe(current.actor());
                if (after !== null) scenes.show(current, "pounce", after.position(),
                    { moment: "pounce", hearts: hearts, scale: scale });
                if (hit.blocked() || swept.moved < 0.02 || travelled >= pounce - 0.02) { miss(current, hit.position()); return; }
                current.after(1, advance);
            }
            advance(action);
        }
    });
}
