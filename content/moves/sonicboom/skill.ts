/**
 * 音爆 / sonicboom 的出手方式。
 *
 * 核心念头：一声音爆，空气被瞬间撕开，一条笔直的裂痕**当刻**出现在对手身上——它没有飞行时间，看不见弹体，
 * 只固定削掉 20 点生命。
 *
 * 两幕 + 收：
 *   起（windup，提交前）：口前空气先被挤出一圈将成的白环，只播预告、可被打断（这是本组最短的一瞬）。
 *   裂（execute → crack / impact）：提交后沿瞄准方向做一次即时 `trace`，裂痕落在第一个非友方或第一堵墙上；
 *       扫到非友方就按固定伤害结算（`sonicboomRawHit`，绕过攻防）并把人推开；撞墙或没人就是空放。
 *   回（reverb，仅回响式）：`echoDelay` 后沿同一方向再爆一声；这时离线的目标不再被扫到——第二声把施法者
 *       多定住一段，这也是回响式的代价。
 *
 * 原生的 90% 命中不掷骰：裂痕即时出现，但起手窗口里走开、或第一堵墙，都会让它从对手身上错开。
 * 固定伤害是这招的承诺：`damage` 不由攻防、相性或暴击改变。
 */
namespace PokemonSkills {
    const sonicboomScene = "world_combat:move_sonicboom";
    const sonicboomHitText = "world_combat.move.sonicboom.text.hit";
    const sonicboomMissText = "world_combat.move.sonicboom.text.miss";
    const sonicboomReverbText = "world_combat.move.sonicboom.text.reverb";

    /** 固定伤害的直接结算入口（与地球上投／黑夜魔影同一套做法）：只被属性免疫挡住，防御不参与。 */
    export function sonicboomRawHit(action: CombatAction, target: CombatActor, amount: number): boolean {
        const world = action.world();
        if (!world.valid(target) || world.friendly(target) || !(amount > 0)) return false;
        const move = CobblemonCombat.moveTemplate("sonicboom"), type = String(move.type());
        const facts = PokemonDamage.combatants.read(world, target);
        for (let index = 0; index < facts.types.length; index++)
            if (CobblemonCombat.typeEffectiveness(type, facts.types[index]) === 0) {
                PokemonDamage.immune(world, target, JSON.stringify({ kind: "move", move: "sonicboom", type: type }));
                return false;
            }
        const armor = world.attributeValue(target, "minecraft:generic.armor");
        const toughness = world.attributeValue(target, "minecraft:generic.armor_toughness");
        const metadata: any = { kind: "move", move: "sonicboom", type: type, category: String(move.category()),
            contact: false, knockback: false, bypassCooldown: true, targetScale: 1, critical: false, action: action.id() };
        if (armor !== null) metadata.armorExcluded = armor.value();
        if (toughness !== null) metadata.toughnessExcluded = toughness.value();
        return world.hurt(target, amount, JSON.stringify(metadata));
    }

    define({
        id: "sonicboom",
        cooldownParameter: "recharge",
        name: "Sonic Boom",
        description: "The target is hit with a destructive shock wave that always inflicts 20 HP damage.",
        uses: ["最便宜、最快的一记固定伤害", "用固定 20 点补刀或磨高防目标", "回响式封住一条直线"],
        kind: "enemy",
        range: 8,
        maxRange: 14,
        prepare: 6,
        active: 0,
        recover: 7,
        cooldown: 20,
        style: "sonic",
        defaults: { reverb: false, ai: { maxChase: 12, finish: true } },
        fields: [],
        indicator: function (config, pokemon) {
            return { radius: p("sonicboom", "boomRadius", pokemon) * 2.2, geometry: "line", style: "sonic", color: 0xEAF6FF,
                label: config && config.reverb === true ? "音爆·回响" : "音爆" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills["sonicboom"], detail: { values: config }, world: world || null, actor: actor || null, attributes };
            return {
                prepare: Math.round(p("sonicboom", "tempo", context)),
                recover: Math.round(p("sonicboom", "settle", context)),
                cooldown: Math.round(p("sonicboom", "recharge", context)),
                active: 0,
                range: p("sonicboom", "reach", context)
            };
        },
        windup: function (action, config, prepare) {
            action.present("sonicboom:windup", sonicboomScene, 1, action.origin(),
                JSON.stringify({ moment: "charge", reverb: config && config.reverb === true, windup: prepare }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const reverb = !!(config && config.reverb);
            const damage = p("sonicboom", "damage", action);
            const reach = p("sonicboom", "reach", action);
            const boomRadius = p("sonicboom", "boomRadius", action);
            const shove = p("sonicboom", "shove", action);
            const sparks = Math.max(8, Math.round(p("sonicboom", "sparks", action)));
            const echoDelay = Math.max(4, Math.round(p("sonicboom", "echoDelay", action)));
            const direction = aim(action);
            const scale = boomRadius / 0.34;
            const intensity = Math.max(0.7, Math.min(2.0, sparks / 20));
            const total = reverb ? 2 : 1;
            let fired = 0;

            sound(action, "minecraft:entity.warden.sonic_charge");
            /** 放一声：即时 trace 出一条裂痕，扫到非友方就固定结算并推开。 */
            function fire(current: CombatAction): void {
                fired++;
                const scope = current.world();
                const body = scope.observe(current.actor());
                if (body === null) { done(current); return; }
                const from = body.position().plus(WorldCombat.point(0, 0.45, 0));
                const to = from.plus(direction.scale(reach));
                const hit = current.trace(from, to, boomRadius);
                const point = hit.position();
                const enemy = hit.hitEntity() ? hit.target() : null;
                const moment = fired > 1 ? "reverb" : "crack";
                const path = [[from.x(), from.y(), from.z()], [point.x(), point.y(), point.z()]];
                let landed = false;
                if (enemy !== null && scope.valid(enemy) && !scope.friendly(enemy)) {
                    landed = sonicboomRawHit(current, enemy, damage);
                    if (landed) scope.displace(enemy, direction.unit().scale(shove));
                    WorldFeedback.emit(scope, sonicboomScene, 1, point,
                        { moment: "impact", target: String(enemy.ref()), sparks: sparks, scale: scale, intensity: intensity, echo: fired }, 22);
                }
                WorldFeedback.emit(scope, sonicboomScene, 1, from,
                    { moment: moment, path: path, target: enemy !== null && landed ? String(enemy.ref()) : undefined,
                        sparks: sparks, scale: scale, intensity: intensity, echo: fired }, 22);
                sound(current, "minecraft:entity.warden.sonic_boom");
                WorldFeedback.text(scope, point.plus(WorldCombat.point(0, 1.0, 0)),
                    landed ? (fired > 1 ? sonicboomReverbText : sonicboomHitText) : sonicboomMissText,
                    landed ? [Math.round(damage)] : [], 22);
                if (fired >= total) done(current);
            }
            fire(action);
            if (reverb) action.after(echoDelay, function (next: CombatAction) { fire(next); });
        }
    });
}
