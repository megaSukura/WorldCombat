/**
 * 影子分身 / doubleteam — 执行组织。
 *
 * 核心念头：用极快的身法在原地留下一圈与本体同步的残影；来袭的攻击先打在残影上，残影替本体挨下这一击，
 * 挨得越多越淡，磨完就散。它不给本体加血、不加防，只是把伤害引到影子上。
 *
 * 出手：短起手（windup 播加速预告）后提交；对自身施放，不需要目标。
 * 命中：提交后挂共享身份 world_combat:status/doubleteam 的 world_combat:doubleteam_mirror（移速小幅提升），
 *       宝可梦再抬一级闪避等级；替打预算交给共享 GuardEffects 的 pool 模式（保护本身用的是同一套机制）。
 * 持续：残影存续期由该 MobEffect 承担；GuardEffects 每 8 刻 pulse 一次续播画面，挨打时播放碎裂。
 * 结束：预算磨完即碎（collapse）；状态被提前解掉（牛奶、清除）时在同一刻收回 guard。
 * 反制：残影只吃伤害、不挡控制与状态；预算有限，磨穿后剩下的照常落到本体。
 */
namespace PokemonSkills {
    function doubleteamAbove(point: CombatPoint): CombatPoint { return point.plus(WorldCombat.point(0, 1, 0)); }

    GuardEffects.register(doubleteamRule, {
        pulse: function (effect, state) {
            const world = effect.world(), body = world.observe(effect.target());
            if (body === null) return;
            const initial = (<any>state).initial || state.capacity || 1;
            const copies = Math.max(1, Math.round((<any>state).copies || 1));
            WorldFeedback.keep(world, "doubleteam-hold", doubleteamScene, 1, body.position(),
                { moment: "sustain", target: String(effect.target().ref()), copies: copies,
                    intensity: Math.max(0.15, Math.min(1, state.capacity / initial)) }, 20);
        },
        guarded: function (effect, state, amount, incoming) {
            const world = effect.world(), target = effect.target(), body = world.observe(target);
            if (body === null) return;
            const initial = (<any>state).initial || state.capacity || 1;
            const copies = Math.max(1, Math.round((<any>state).copies || 1));
            const blocked = Math.round(amount * 10) / 10;
            const remaining = Math.round(state.capacity * 10) / 10;
            const intensity = Math.max(0.2, Math.min(1, state.capacity / initial));
            WorldFeedback.emit(world, doubleteamScene, 1, body.position(),
                { moment: "shatter", target: String(target.ref()), copies: copies, blocked: blocked, remaining: remaining, intensity: intensity }, 26);
            WorldFeedback.text(world, doubleteamAbove(body.position()),
                "world_combat.move.doubleteam.text.shatter", [blocked, remaining], 30);
            world.sound("cobblemon:move.doubleteam.actor", body.position(), 12, "{}");
            if (state.capacity <= 0) {
                WorldFeedback.emit(world, doubleteamScene, 1, body.position(),
                    { moment: "collapse", target: String(target.ref()), copies: copies }, 32);
                WorldFeedback.text(world, doubleteamAbove(body.position()), "world_combat.move.doubleteam.text.collapse", [], 30);
                world.sound("minecraft:entity.illusioner.mirror_move", body.position(), 14, "{}");
            }
        }
    });

    define({
        id: doubleteamId,
        cooldownParameter: "recharge",
        name: "影子分身",
        description: "用极快的身法留下数个与本体同步的残影；来袭的攻击先打在残影上，残影替本体挨下这一击，磨完就散，身法也随之更快。它不加血、不加防，只把伤害引到影子上。",
        uses: ["在被集火前先手留影，把伤害引到影子上", "被追击时借加速脱身，让残影替你挨打", "为换位或撤退争取几秒"],
        kind: "self",
        range: 0,
        maxRange: 0,
        prepare: 12,
        active: 1,
        recover: 6,
        cooldown: 140,
        style: "afterimage",
        defaults: { deploy: "swarm" },
        fields: [
            choice("deploy", "留影方式", ["swarm", "swift"], ["群影", "疾影"])
        ],
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills[doubleteamId], detail: { values: config }, world, actor, attributes };
            const swarm = config.deploy !== "swift";
            return {
                prepare: Math.round(p(doubleteamId, "tempo", context)) + (swarm ? 3 : -2),
                recover: Math.round(p(doubleteamId, "aftercast", context)),
                cooldown: Math.round(p(doubleteamId, "recharge", context) * (swarm ? 1.2 : 0.75)),
                range: 0,
                active: 1
            };
        },
        windup: function (action, config, prepare) {
            action.present("world_combat:move_doubleteam:windup", doubleteamScene, 1, action.origin(),
                JSON.stringify({ moment: "windup", swift: config.deploy === "swift" ? 1 : 0 }));
            return prepare;
        },
        indicator: function () { return { radius: 1.4, geometry: "circle", style: "afterimage", color: 0x9AA8C8, label: "影子分身" }; },
        execute: function (action, move, config, done) {
            const world = action.world(), actor = action.actor(), body = world.observe(actor);
            if (body === null) { done(action); return; }
            const swarm = config.deploy !== "swift";
            const copies = Math.max(1, Math.min(5, Math.round(p(doubleteamId, "copies", action)) + (swarm ? 1 : -1)));
            const window = Math.max(40, Math.round(p(doubleteamId, "mirrorWindow", action) * (swarm ? 1.25 : 0.8)));
            const fraction = Math.max(0.1, Math.min(1, p(doubleteamId, "mirrorPool", action) * (swarm ? 1.25 : 0.8)));
            const motes = Math.max(4, Math.round(p(doubleteamId, "motes", action)));
            const capacity = Math.max(1, body.maxHealth() * fraction);
            MobEffects.apply(world, actor, doubleteamEffect, window, 0);
            if (String(actor.domain()) === "cobblemon") NativeEffects.boost(world, actor, "evasion", 1);
            const guard: any = { rule: doubleteamRule, mode: "pool", capacity: capacity, fraction: 1,
                minimumHealth: 0, charges: 0, linkRange: 0, initial: capacity, copies: copies, window: window };
            GuardEffects.apply(world, actor, guard, window);
            if (!swarm) MobEffects.apply(world, actor, "minecraft:speed", window, 1);
            WorldFeedback.emit(world, doubleteamScene, 1, body.position(),
                { moment: "deploy", target: String(actor.ref()), copies: copies, motes: motes,
                    scale: Math.max(0.6, Math.min(2, window / 180)) }, 40);
            WorldFeedback.text(world, doubleteamAbove(body.position()), "world_combat.move.doubleteam.text.deploy", [copies], 40);
            sound(action, "cobblemon:move.doubleteam.actor");
            done(action);
        }
    });

    // 状态被提前解掉时（牛奶、清除、被取代），在同一刻收回替打预算，避免残影消失了还在挡伤害。
    WorldCombat.on("world_combat:move_doubleteam/dispel", "world_combat:mob_effect_removed", "", function (event) {
        const data = JSON.parse(String(event.data()));
        if (String(data.id) !== doubleteamEffect) return;
        const world = event.world(), actor = event.actor();
        if (!world.valid(actor)) return;
        const guards = world.effects(actor, "world_combat:guard");
        for (let i = 0; i < guards.length; i++) {
            const state = JSON.parse(String(guards[i].data()));
            if (state.rule === doubleteamRule) world.operation(guards[i].id(), "world_combat:dispel", "{}");
        }
    });
}
