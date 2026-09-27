/**
 * 地狱突刺 / throatchop —— 执行组织。
 *
 * 核心念头：一记直取咽喉的突刺，命中那一下是物理伤害，之后把对手的嗓子掐住，让它在一段时间里
 *   再也发不出声音类招式。
 *
 * 三幕：
 *   起（windup，提交前）：暗色气在拳/爪上收拢，只播预告。
 *   刺（execute）：沿瞄准方向递出直刺，trace 判定；命中活体结算一次 chop 物理伤害。
 *   封（hit → linger → recover）：命中即挂共享身份 world_combat:status/throatchop 的咽喉载体，
 *       期间带 sound 标记的招式在提交时被顶回去、原生音攻在伤害阶段被顶回去（parameters.ts 的门禁），载体到点自行褪去；
 *       咽喉印记由绑定该载体的托管标记维持，载体重刷按最新 revision 起停，驱散即停。
 * 反制：直刺是近身直线，够不到或射程外就落空；锁喉式更久但更慢更轻，割喉式更快更重但封得短。
 */
namespace PokemonSkills {
    /** 载体环的托管标记：把咽喉印记绑在真实咽喉载体效果上，载体重刷用最新 revision，驱散即停不留残影。 */
    const throatChopMark = "world_combat:move_throatchop/seal_mark";

    function throatChopAbove(point: CombatPoint): CombatPoint { return point.plus(WorldCombat.point(0, 1.3, 0)); }

    // 咽喉被封的存续期：托管标记每隔一段时间在目标咽喉处沉着一圈暗红印记，让玩家看出「它现在叫不出声」；
    // 每次到期前按真实载体剩余时间重排，载体消失或被解除时标记自行结束，presentOn 随标记一起清理。
    function throatChopSealWatch(effect: CombatEffect): void {
        const world = effect.world(), target = effect.target();
        const body = world.valid(target) ? world.observe(target) : null;
        if (body === null) { effect.end(); return; }
        const carrier = world.mobEffect(target, throatChopEffect);
        if (carrier === null) { effect.end(); return; }
        WorldFeedback.onEffect(world, effect.id(), "linger", throatChopScene, 1, body.position(),
            { moment: "linger", target: String(target.ref()) });
        const remaining = carrier.duration() < 0 ? 2400 : Math.max(1, Math.min(2400, carrier.duration()));
        effect.remaining(remaining);
        effect.schedule("watch", "watch", 20, "{}");
    }
    WorldCombat.effect(throatChopMark, 1, 2400, "actor", function (json) {
        var value = JSON.parse(json || "{}");
        if (value === null || typeof value !== "object") throw new Error("Invalid throatchop seal mark");
        return JSON.stringify(value);
    }, EffectProtocols.unchanged);
    WorldCombat.effectHandler(throatChopMark, "start", throatChopSealWatch);
    WorldCombat.effectHandler(throatChopMark, "watch", throatChopSealWatch);
    WorldCombat.effectHandler(throatChopMark, "operation:world_combat:dispel", function (effect: CombatEffect) { effect.end(); });

    // 走完自己的时间与被外力解除是两条岔路：到期是嗓子自己缓过来，被清除是被人硬解，画面不同。
    WorldCombat.on("world_combat:move_throatchop/end", "world_combat:mob_effect_removed", "", function (event: CombatWorldEvent) {
        var data = JSON.parse(String(event.data()));
        if (String(data.id) !== throatChopEffect) return;
        var world = event.world(), actor = event.actor();
        if (!world.valid(actor)) return;
        // 牛奶／/effect clear 提前拿掉载体时，立刻撤掉托管表现，不等它自己的下一次巡检。
        world.effects(actor, throatChopMark).forEach(function (view) { world.operation(view.id(), "world_combat:dispel", "{}"); });
        var body = world.observe(actor);
        if (body === null) return;
        var expired = String(data.cause) === "expired";
        WorldFeedback.emit(world, throatChopScene, 1, body.position(),
            { moment: expired ? "recover" : "subside", target: String(actor.ref()), expired: expired ? 1 : 0 }, 26);
        if (expired) WorldFeedback.text(world, throatChopAbove(body.position()), throatChopFadeText, [], 30);
        world.sound("minecraft:block.sculk_sensor.clicking_stop", body.position(), 12, "{}");
    });

    define({
        id: throatChopId,
        cooldownParameter: "recharge",
        name: "Throat Chop",
        description: "一记直取咽喉的突刺。命中造成物理伤害，并让目标在一段时间内无法使出任何声音类招式。",
        uses: ["封住对手的吼叫与音波", "惩罚依赖声音类招式的对手", "近身压制远程施法者"],
        kind: "aim",
        range: 2.8,
        maxRange: 3.6,
        prepare: 9,
        active: 0,
        recover: 8,
        cooldown: 70,
        style: "chop",
        defaults: { choke: true, ai: { maxChase: 4 } },
        fields: [flag("choke", "锁喉")],
        indicator: function (config) {
            return { radius: 0.6, geometry: "point", style: "chop", color: 0x7A1E3A,
                label: config && config.choke === true ? "地狱突刺·锁喉" : "地狱突刺·割喉" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills[throatChopId], detail: { values: config }, world: world || null, actor: actor || null, attributes };
            return { prepare: p(throatChopId, "tempo", context), recover: p(throatChopId, "settle", context),
                cooldown: p(throatChopId, "recharge", context), active: 0, range: p(throatChopId, "reach", context) };
        },
        windup: function (action, config, prepare) {
            action.present("throatchop:windup", throatChopScene, 1, action.origin(),
                JSON.stringify({ moment: "windup", target: action.target() === null ? "" : String(action.target()!.ref()), choke: config && config.choke === true }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const world = action.world(), self = action.actor();
            const origin = action.origin(), targetPos = action.targetPosition();
            const selfBody = world.observe(self);
            const target = action.target();
            const targetBody = target !== null && world.valid(target) ? world.observe(target) : null;
            const radius = p(throatChopId, "radius", action);
            const power = p(throatChopId, "chop", action);
            const ticks = Math.max(40, Math.round(p(throatChopId, "silenceTicks", action)));
            // 手刀从施法者身体较高处递向目标咽喉处：判定线由 from 到受限接触点 to 定义，表现方向与长度共用同一组端点。
            const rise = selfBody === null ? 0.3 : selfBody.height() * 0.2;
            const targetRise = targetBody === null ? rise : targetBody.height() * 0.3;
            const from = origin.plus(WorldCombat.point(0, rise, 0));
            const aim = targetPos.plus(WorldCombat.point(0, targetRise, 0));
            const offset = aim.minus(from);
            const direction = offset.length() < 0.01 ? action.direction() : offset.unit();
            const reach = Math.max(0.5, Math.min(action.range(), offset.length() || action.range()));
            const to = from.plus(direction.scale(reach));
            sound(action, "minecraft:entity.player.attack.strong");
            WorldFeedback.emit(world, throatChopScene, 1, from,
                { moment: "thrust", reach: reach, direction: [direction.x(), direction.y(), direction.z()],
                    target: target === null ? "" : String(target.ref()), choke: config && config.choke === true }, 18);
            // 短直线首接触；友方也纳入接触，伤害许可仍由命中层独立判定。
            const hit = action.trace(from, to, radius, true);
            const victim = hit.hitEntity() ? hit.target() : null;
            if (victim === null) {
                if (hit.blocked()) {
                    // 实际接触点用 hit.position()；blockPosition() 只是方块格坐标，不能当接触点。
                    const at = hit.position();
                    WorldFeedback.emit(world, throatChopScene, 1, at, { moment: "block", face: hit.blockFace() }, 20);
                    world.sound("minecraft:entity.warden.attack_impact", at, 10, "{}");
                } else {
                    WorldFeedback.emit(world, throatChopScene, 1, to, { moment: "whiff" }, 20);
                    WorldFeedback.text(world, throatChopAbove(to), throatChopWhiffText, [], 24);
                }
                sound(action, "minecraft:entity.player.attack.sweep");
                done(action);
                return;
            }
            if (world.friendly(victim) || String(victim.key()) === String(self.key())) {
                const ally = world.observe(victim);
                const at = ally === null ? hit.position() : ally.position();
                WorldFeedback.emit(world, throatChopScene, 1, at, { moment: "block", face: hit.blockFace() }, 20);
                sound(action, "minecraft:entity.player.attack.sweep");
                done(action);
                return;
            }
            const landed = impact(action, hit, throatChopId, power, { damage: damageSpec(throatChopId, "chop"), contact: true });
            const at = world.observe(victim);
            const point = at === null ? hit.position() : at.position();
            if (landed) {
                // 真实封锁状态才接通喉环；免状态（政策拒绝）只留伤害闪光与文字。
                const sealed = CombatStatus.apply(world, victim, throatChopStatus, throatChopEffect, ticks, 0, { unique: true });
                WorldFeedback.emit(world, throatChopScene, 1, point,
                    { moment: "hit", target: String(victim.ref()), scale: Math.max(0.6, Math.min(1.8, reach / 2.8)),
                        motes: Math.max(16, Math.round(power * 0.3)),
                        intensity: Math.max(0.5, Math.min(2.2, power / 80)) }, 30);
                if (sealed) {
                    if (world.effects(victim, throatChopMark).length === 0)
                        world.effect(throatChopMark, victim, "{}", Math.max(1, Math.min(2400, ticks)));
                    WorldFeedback.emit(world, throatChopScene, 1, point,
                        { moment: "seal", target: String(victim.ref()), motes: Math.max(10, Math.round(power * 0.2)) }, 28);
                    WorldFeedback.text(world, throatChopAbove(point), throatChopText, [Math.round(ticks / 20)], 32);
                }
                world.sound("cobblemon:impact.dark", point, 16, "{}");
                if (sealed) world.sound("minecraft:entity.warden.attack_impact", point, 12, "{}");
            } else {
                WorldFeedback.emit(world, throatChopScene, 1, point, { moment: "whiff", target: String(victim.ref()) }, 20);
            }
            done(action);
        }
    });
}
