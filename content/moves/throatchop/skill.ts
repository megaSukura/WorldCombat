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
 *       期间任何带 sound 标记的招式在提交时被顶回去（parameters.ts 的门禁），载体到点自行褪去。
 * 反制：直刺是近身直线，够不到或射程外就落空；锁喉式更久但更慢更轻，割喉式更快更重但封得短。
 */
namespace PokemonSkills {
    function throatChopAbove(point: CombatPoint): CombatPoint { return point.plus(WorldCombat.point(0, 1.3, 0)); }

    // 咽喉被封的存续期：每隔一段时间在目标咽喉处沉着一圈暗红印记，让玩家看出「它现在叫不出声」。
    WorldCombat.on("world_combat:move_throatchop/linger", "world_combat:mob_effect_tick", "", function (event: CombatWorldEvent) {
        var data = JSON.parse(String(event.data()));
        if (String(data.id) !== throatChopEffect) return;
        var world = event.world(), actor = event.actor();
        if (!world.valid(actor) || world.tick() % 20 !== 0) return;
        var body = world.observe(actor);
        if (body === null) return;
        WorldFeedback.keep(world, "throatchop:seal:" + String(actor.ref()), throatChopScene, 1, body.position(),
            { moment: "linger", target: String(actor.ref()) }, 40);
    });

    // 走完自己的时间与被外力解除是两条岔路：到期是嗓子自己缓过来，被清除是被人硬解，画面不同。
    WorldCombat.on("world_combat:move_throatchop/end", "world_combat:mob_effect_removed", "", function (event: CombatWorldEvent) {
        var data = JSON.parse(String(event.data()));
        if (String(data.id) !== throatChopEffect) return;
        var world = event.world(), actor = event.actor();
        if (!world.valid(actor)) return;
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
        name: "Throat Chop",
        description: "一记直取咽喉的突刺。命中造成物理伤害，并让目标在一段时间内无法使出任何声音类招式。",
        uses: ["打断对手的吼叫／音波", "惩罚依赖声音类招式的对手", "近身压制远程施法者"],
        kind: "enemy",
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
            const delta = targetPos.minus(origin);
            const direction = delta.length() < 0.01 ? action.direction() : delta.unit();
            const reach = Math.max(0.5, Math.min(action.range(), delta.length() || action.range()));
            const radius = p(throatChopId, "radius", action);
            const power = p(throatChopId, "chop", action);
            const ticks = Math.max(40, Math.round(p(throatChopId, "silenceTicks", action)));
            sound(action, "minecraft:entity.player.attack.strong");
            WorldFeedback.emit(world, throatChopScene, 1, origin,
                { moment: "thrust", reach: reach, direction: [direction.x(), direction.y(), direction.z()],
                    target: action.target() === null ? "" : String(action.target()!.ref()), choke: config && config.choke === true }, 18);
            const hit = action.trace(origin, targetPos, radius);
            const victim = hit.hitEntity() ? hit.target() : null;
            if (victim === null || world.friendly(victim) || String(victim.key()) === String(self.key())) {
                WorldFeedback.emit(world, throatChopScene, 1, targetPos, { moment: "whiff" }, 20);
                WorldFeedback.text(world, throatChopAbove(targetPos), throatChopWhiffText, [], 24);
                sound(action, "minecraft:entity.player.attack.sweep");
                done(action);
                return;
            }
            const landed = impact(action, hit, throatChopId, power, { damage: damageSpec(throatChopId, "chop"), contact: true });
            const at = world.observe(victim);
            const point = at === null ? hit.position() : at.position();
            if (landed) {
                CombatStatus.apply(world, victim, throatChopStatus, throatChopEffect, ticks, 0, { unique: true });
                WorldFeedback.emit(world, throatChopScene, 1, point,
                    { moment: "hit", target: String(victim.ref()), scale: Math.max(0.6, Math.min(1.8, reach / 2.8)),
                        motes: Math.max(16, Math.round(power * 0.3)),
                        intensity: Math.max(0.5, Math.min(2.2, power / 80)) }, 30);
                WorldFeedback.text(world, throatChopAbove(point), throatChopText, [Math.round(ticks / 20)], 32);
                world.sound("cobblemon:impact.dark", point, 16, "{}");
                world.sound("minecraft:entity.warden.attack_impact", point, 12, "{}");
            } else {
                WorldFeedback.emit(world, throatChopScene, 1, point, { moment: "whiff", target: String(victim.ref()) }, 20);
            }
            done(action);
        }
    });
}
