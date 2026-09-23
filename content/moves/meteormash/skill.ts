/**
 * 彗星拳 / meteormash —— 注册与动作。
 *
 * 核心念头：先冲进拳程，再由上而下把一记燃着流星火的钢拳砸实；拳落之处炸开一圈碎石火星、地面留下一小片焦黑的坑。
 *   正面砸中的吃重拳，落点周围的被震开。反震让机身发热，有概率把物攻抬一级。它是余波族里唯一的物理拳、唯一留坑的一记。
 *
 * 三幕：
 *   起（windup，提交前）：拳上聚起流星火花、脚下压出细尘，只播预告。
 *   冲（charge）：提交后沿瞄准方向冲进拳程，越冲越快，拳上的火拖出尾迹。
 *   砸（smash → hit / miss）：贴到拳程内一拳砸下：正面命中的吃 `impact`（带 punch、接触）；落点 `crashRadius`
 *       一圈内的其他敌人吃 `shock` 并被震开 `shove` 格；地面被砸出 `craterRadius` 的焦坑，停留 `craterTicks`；
 *       随后掷一次反哺，成功则攻击上升 `surgeStages` 级。
 *
 * 配置 `comet`（陨星式）由 resolve 改时序、由公式改冲刺／落点／拳威：开启＝冲得更远、震得更广、留下更大的坑。
 */
namespace PokemonSkills {
    const meteormashScene = "world_combat:move_meteormash";
    const meteormashSurgeText = "world_combat.move.meteormash.text.surge";
    const meteormashHitText = "world_combat.move.meteormash.text.hit";
    const meteormashMissText = "world_combat.move.meteormash.text.miss";

    /** 把落点一圈的地面砸成焦黑：内圈黑石、外圈玄武岩；石头与方块实体不动，到期原方块回来。 */
    function meteormashCrater(world: CombatWorld, point: CombatPoint, radius: number, ticks: number): number {
        const cells: any[] = [], r = Math.ceil(radius);
        const px = point.x(), py = point.y(), pz = point.z();
        for (let dx = -r; dx <= r; dx++) for (let dz = -r; dz <= r; dz++) {
            const distance = Math.sqrt(dx * dx + dz * dz);
            if (distance > radius) continue;
            const x = Math.floor(px) + dx, z = Math.floor(pz) + dz;
            for (let dy = 0; dy >= -3; dy--) {
                const y = Math.floor(py) + dy;
                const block = world.block(WorldCombat.point(x, y, z));
                if (block === null) break;
                const id = String(block.id());
                if (id === "minecraft:air" || id === "minecraft:cave_air" || id === "minecraft:void_air") continue;
                if (id === "minecraft:bedrock" || id === "minecraft:barrier" || id === "minecraft:water" || id === "minecraft:lava") break;
                const surface = distance <= radius * 0.5 ? "minecraft:blackstone" : "minecraft:basalt";
                if (id !== surface) cells.push({ x: x, y: y, z: z, block: surface });
                break;
            }
        }
        if (!cells.length) return 0;
        try { world.terrain(JSON.stringify({ cells: cells, replace: true, linger: true }), ticks); }
        catch (error) { return 0; }
        return cells.length;
    }

    define({
        id: "meteormash",
        cooldownParameter: "recharge",
        name: "Meteor Mash",
        description: "冲进拳程再一拳砸下：正面命中的目标吃重拳，落点一圈内的其他敌人被震开并受伤，地面被砸出一小片焦黑的坑；砸实的反震有概率把自身物攻抬一级。陨星式冲得更远、震得更广、留下更大的坑；重拳式拳更重、出手更利落。",
        uses: ["贴身用一记重拳点名一个目标", "顺带震开挤在目标身边的其他人", "在地面留下焦坑标记这一拳的落点"],
        kind: "enemy",
        range: 4.5,
        maxRange: 7,
        prepare: 8,
        active: 0,
        recover: 10,
        cooldown: 30,
        style: "meteorfist",
        defaults: { comet: false, ai: { maxChase: 9, finishLow: true } },
        fields: [],
        indicator: function (config, pokemon) {
            return { radius: p("meteormash", "crashRadius", pokemon), geometry: "area", style: "meteorfist", color: 0xC9A24A,
                label: config && config.comet === true ? "陨星式" : "彗星拳" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills["meteormash"], detail: { values: config },
                world: world || null, actor: actor || null, attributes };
            return {
                prepare: Math.round(p("meteormash", "tempo", context)),
                recover: Math.round(p("meteormash", "aftercast", context)),
                cooldown: Math.round(p("meteormash", "recharge", context)),
                active: 0,
                range: p("meteormash", "reach", context)
            };
        },
        windup: function (action, config, prepare) {
            action.present("meteormash:windup", meteormashScene, 1, action.origin(),
                JSON.stringify({ moment: "windup", reach: p("meteormash", "reach", action),
                    comet: config && config.comet === true }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const world = action.world();
            const actor = action.actor();
            const body = world.observe(actor);
            if (body === null) { done(action); return; }
            const aimPoint = action.targetPosition();
            const power = p("meteormash", "impact", action);
            const shock = p("meteormash", "shock", action);
            const reach = Math.max(2.5, p("meteormash", "reach", action));
            const fist = Math.max(0.4, p("meteormash", "fist", action));
            const crashRadius = Math.max(1.0, p("meteormash", "crashRadius", action));
            const shove = p("meteormash", "shove", action);
            const craterRadius = Math.max(0.8, p("meteormash", "craterRadius", action));
            const craterTicks = Math.max(60, Math.round(p("meteormash", "craterTicks", action)));
            const flare = Math.max(14, Math.round(p("meteormash", "flare", action)));
            const chance = Math.max(0.02, Math.min(0.9, p("meteormash", "surgeChance", action)));
            const stages = Math.max(1, Math.round(p("meteormash", "surgeStages", action)));
            const direction = aim(action);
            const scale = Math.max(0.6, Math.min(2.2, crashRadius / 1.6));
            const intensity = Math.max(0.5, Math.min(2.6, power / 95));
            const delta = aimPoint.minus(body.position());
            const flat = WorldCombat.point(delta.x(), 0, delta.z());
            const gap = flat.length();
            const approach = Math.max(0, Math.min(reach, gap - 1.2));
            let settled = false;

            function finish(current: CombatAction): void { if (!settled) { settled = true; done(current); } }

            sound(action, "minecraft:entity.firework_rocket.launch");
            WorldFeedback.emit(world, meteormashScene, 1, body.position(),
                { moment: "windup", flare: flare, scale: scale, intensity: intensity }, 16);

            function smash(current: CombatAction): void {
                const scope = current.world();
                const self = scope.observe(actor);
                if (self === null) { finish(current); return; }
                const from = self.position(), to = from.plus(direction.scale(reach));
                const trace = current.trace(from, to, fist);
                const victim = trace.target();
                const land = trace.hitEntity() ? trace.position() : to;
                let hits = 0;
                if (trace.hitEntity() && victim !== null && scope.valid(victim) && !scope.friendly(victim)) {
                    if (impact(current, trace, "meteormash", power,
                        { damage: damageSpec("meteormash", "impact"), contact: true, punch: true })) hits++;
                }
                WorldFeedback.emit(scope, meteormashScene, 1, from,
                    { moment: "smash", flare: flare, scale: scale, intensity: intensity,
                      path: [[from.x(), from.y() + self.height() * 0.5, from.z()], [to.x(), to.y() + self.height() * 0.5, to.z()]] }, 16);
                sound(current, "minecraft:item.mace.smash_ground");
                WorldGeometry.selectEnemies(scope, WorldGeometry.ring(land, 0, crashRadius, { below: 2, above: 3 }), function (enemy, facts) {
                    if (String(enemy.ref()) === String(actor.ref())) return;
                    if (victim !== null && String(enemy.ref()) === String(victim.ref())) return;
                    if (!hurt(current, enemy, "meteormash", shock, { damage: damageSpec("meteormash", "shock") })) return;
                    hits++;
                    const away = facts.position().minus(land);
                    if (scope.valid(enemy) && away.length() > 0.05)
                        scope.displace(enemy, WorldCombat.point(away.x(), 0, away.z()).unit().scale(shove));
                    WorldFeedback.emit(scope, meteormashScene, 1, facts.position(),
                        { moment: "hit", target: String(enemy.ref()), flare: flare, scale: scale,
                          intensity: Math.max(0.5, Math.min(2.4, shock / 60)) }, 22);
                });
                const cells = meteormashCrater(scope, land, craterRadius, craterTicks);
                WorldFeedback.emit(scope, meteormashScene, 1, land,
                    { moment: "crash", flare: flare, cells: cells, hits: hits, scale: scale,
                      intensity: hits > 0 ? Math.max(0.7, intensity) : 0.8 }, 34);
                sound(current, "minecraft:entity.generic.explode");
                sound(current, "cobblemon:impact.steel");
                WorldFeedback.text(scope, land.plus(WorldCombat.point(0, 1.3, 0)),
                    hits > 0 ? meteormashHitText : meteormashMissText, hits > 0 ? [hits] : [], 26);
                if (hits === 0)
                    WorldFeedback.emit(scope, meteormashScene, 1, land, { moment: "miss", flare: flare, scale: scale }, 20);

                if (hits > 0 && scope.random() < chance) {
                    NativeEffects.boost(scope, actor, "atk", stages);
                    const me = scope.observe(actor);
                    const at = me === null ? from : me.position();
                    WorldFeedback.emit(scope, meteormashScene, 1, at,
                        { moment: "surge", target: String(actor.ref()), stages: stages, flare: flare, scale: scale }, 26);
                    WorldFeedback.text(scope, at.plus(WorldCombat.point(0, me === null ? 1.4 : me.height() + 0.1, 0)),
                        meteormashSurgeText, [stages], 30);
                    scope.sound("minecraft:block.anvil.land", at, 18, "{}");
                }
                finish(current);
            }

            function charge(current: CombatAction, remaining: number): void {
                const scope = current.world();
                if (remaining <= 0.05) { smash(current); return; }
                const step = Math.min(0.85, remaining);
                const moved = scope.displace(actor, direction.scale(step));
                const self = scope.observe(actor);
                if (self !== null)
                    WorldFeedback.emit(scope, meteormashScene, 1, self.position(),
                        { moment: "charge", flare: flare, scale: scale }, 12);
                if (moved < 0.05) { smash(current); return; }
                current.after(1, function (next: CombatAction) { charge(next, remaining - moved); });
            }

            charge(action, approach);
        }
    });
}
