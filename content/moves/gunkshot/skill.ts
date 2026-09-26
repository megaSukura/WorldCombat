/**
 * 垃圾射击 / gunkshot —— 出手方式。
 *
 * 核心念头：一记**把压缩垃圾团当炮弹轰出去的直线重击**。施法者把一大团脏垃圾压进身体、对准目标轰出去；
 *   炮弹带一个由命中 80 翻来的偏角，离得越远越容易从目标身边擦过。打中就吃一记很重的物理伤害、
 *   被沿弹道顶开、按概率中毒；打偏则按真实撞点分两种收场：撞墙在墙面糊一次污，空飞则落在真实轨迹末端散开。
 *
 * 幕：
 *   起（windup，提交前）：垃圾在身前被压实、炮口聚起碎屑的预告（`action.present`，可被打断、不花 PP）。
 *   轰（blast → flight，提交后）：炮口爆出一蓬碎屑，炮弹带真实随机偏角沿直线飞；飞行表现只在本次动作内维持，
 *       命中/落点一确定就 stop，动作结束 finish。
 *   中（hit / wall / whiff）：命中→结算 `wad` 物理伤害、沿真实飞行方向顶开、按概率挂共享中毒身份；
 *       撞墙→只糊一次污；空飞到真实轨迹末端→散落垃圾。一次炮弹只出一份结果（共享 settled 门）。
 *
 * 与同族分开：污泥攻击是低弧小泥团、污泥炸弹是落地插引信的延时爆弹、浊雾是正前方雾锥；
 *   只有垃圾射击是**一次负重直线重炮**，而且是唯一可能真的打偏的一招，反制方式是拉开距离让偏角替你躲掉。
 */
namespace PokemonSkills {
    const gunkshotScene = "world_combat:move_gunkshot";
    const gunkshotHitText = "world_combat.move.gunkshot.text.hit";
    const gunkshotPoisonText = "world_combat.move.gunkshot.text.poison";
    const gunkshotImmuneText = "world_combat.move.gunkshot.text.immune";
    const gunkshotWhiffText = "world_combat.move.gunkshot.text.whiff";
    const gunkshotWallText = "world_combat.move.gunkshot.text.wall";

    /** 把瞄准方向绕竖直轴随机转一个偏角（命中 80 的即时翻译）。 */
    function gunkshotSpread(direction: CombatPoint, degrees: number, roll: number): CombatPoint {
        if (!(degrees > 0.01)) return direction;
        const angle = (roll * 2 - 1) * degrees * Math.PI / 180;
        const cos = Math.cos(angle), sin = Math.sin(angle);
        const x = direction.x(), z = direction.z();
        return WorldCombat.point(x * cos - z * sin, direction.y(), x * sin + z * cos).unit();
    }

    define({
        id: "gunkshot",
        cooldownParameter: "recharge",
        name: "Gunk Shot",
        description: "把一大团脏垃圾压进身体、当炮弹直线轰出去（可对空地点开炮）：这一族唯一的物理重击，命中的话伤得很重、把目标顶开、可能中毒；但炮弹带偏角，离得越远越容易打偏。撞墙只糊一次污，空飞在真实轨迹末端散落。重装取向更狠更飘，轻装取向更稳更快。",
        uses: ["远距离一发很重的物理打击", "把冲上来的目标轰开", "用可能打偏的一炮赌一次高收益"],
        kind: "aim",
        range: 12,
        maxRange: 20,
        prepare: 16,
        active: 0,
        recover: 10,
        cooldown: 40,
        style: "sludge",
        defaults: { heavy: false, ai: { maxChase: 16, preferBig: true, leaveStation: true } },
        fields: [],
        indicator: function (config, pokemon) {
            const context: NumberContext = { pokemon: pokemon!, skill: skills["gunkshot"], detail: { values: config } };
            return { radius: p("gunkshot", "reach", context), geometry: "line", style: "sludge", color: 0x6E8C3A,
                label: config && config.heavy === true ? "垃圾射击·重装" : "垃圾射击" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills["gunkshot"], detail: { values: config }, world: world || null, actor: actor || null, attributes };
            return {
                prepare: Math.round(p("gunkshot", "load", context)),
                recover: Math.round(p("gunkshot", "settle", context)),
                cooldown: Math.round(p("gunkshot", "recharge", context)),
                active: 0,
                range: p("gunkshot", "reach", context)
            };
        },
        windup: function (action, config, prepare) {
            const chunks = Math.max(6, Math.round(p("gunkshot", "chunks", action)));
            action.present("gunkshot:load:" + action.id(), gunkshotScene, 1, action.origin(),
                JSON.stringify({ moment: "load", windup: prepare, chunks: chunks, heavy: config && config.heavy === true }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const world = action.world();
            const scenes = WorldFeedback.actionScenes(gunkshotScene);
            const origin = action.origin();
            const speed = p("gunkshot", "muzzle", action);
            const radius = p("gunkshot", "wadRadius", action);
            const power = p("gunkshot", "wad", action);
            const spread = p("gunkshot", "spread", action);
            const shove = p("gunkshot", "shove", action);
            const chance = p("gunkshot", "poisonChance", action);
            const venomTicks = Math.max(40, Math.round(p("gunkshot", "venomTicks", action)));
            const chunks = Math.max(8, Math.round(p("gunkshot", "chunks", action)));
            const scale = Math.max(0.7, Math.min(1.8, radius / 0.26));
            const intensity = Math.max(0.7, Math.min(2.4, power / 110));
            const launch = gunkshotSpread(aim(action), spread, world.random());
            // 真实飞行方向（水平分量）：命中后按它顶开，保留原水平推开语义。
            const heading = WorldCombat.point(launch.x(), 0, launch.z()).length() < 0.01
                ? WorldCombat.point(0, 0, 1) : WorldCombat.point(launch.x(), 0, launch.z()).unit();
            // 公开 reach 就是实际投射 range；空飞到期时沿真实出膛方向落到这个真实末端。
            const flightRange = action.range();
            const rangeEnd = origin.plus(launch.unit().scale(flightRange));
            let settled = false, resolved = false;

            function finish(current: CombatAction): void { if (!settled) { settled = true; scenes.finish(current, done); } }

            /** 命中活物：物理重击、沿真实弹道顶开、按概率挂毒。 */
            function connect(current: CombatAction, hit: CombatImpact): void {
                if (resolved) return;
                const scope = current.world();
                const target = hit.target();
                if (target === null || !scope.valid(target) || scope.friendly(target)) { miss(current, hit.position(), false, ""); return; }
                resolved = true;
                scenes.stop(current, "flight");
                const dealt = impact(current, hit, "gunkshot", power,
                    { damage: damageSpec("gunkshot", "wad"), contact: false });
                let poisoned = false;
                if (dealt && scope.valid(target)) {
                    scope.displace(target, heading.scale(shove));
                    if (scope.valid(target) && scope.random() < chance)
                        poisoned = CombatStatus.inflict(scope, target, "poison", venomTicks, 0, { secondary: true });
                }
                const at = scope.valid(target) ? scope.observe(target) : null;
                const where = at === null ? hit.position() : at.position();
                WorldFeedback.emit(scope, gunkshotScene, 1, where,
                    { moment: dealt ? "hit" : "immune", target: String(target.ref()), chunks: chunks,
                        scale: scale, intensity: dealt ? intensity : intensity * 0.4 }, 26);
                if (dealt) WorldFeedback.text(scope, where.plus(WorldCombat.point(0, 1.0, 0)),
                    poisoned ? gunkshotPoisonText : gunkshotHitText, [], 24);
                else WorldFeedback.text(scope, where.plus(WorldCombat.point(0, 1.0, 0)), gunkshotImmuneText, [], 22);
                if (poisoned) scope.sound("cobblemon:impact.poison", where, 14, "{}");
                finish(current);
            }

            /** 打偏：撞墙在墙面糊一次污，空飞到真实轨迹末端散落垃圾。一次炮弹只出一份结果。 */
            function miss(current: CombatAction, point: CombatPoint, blocked: boolean, face: string): void {
                if (resolved) return;
                resolved = true;
                scenes.stop(current, "flight");
                const scope = current.world();
                WorldFeedback.emit(scope, gunkshotScene, 1, point,
                    { moment: blocked ? "wall" : "whiff", point: [point.x(), point.y(), point.z()],
                        face: face, chunks: Math.round(chunks * 0.7), scale: scale }, 22);
                WorldFeedback.text(scope, point.plus(WorldCombat.point(0, 0.6, 0)),
                    blocked ? gunkshotWallText : gunkshotWhiffText, [], 20);
                finish(current);
            }

            sound(action, "cobblemon:move.sludgebomb.actor");
            sound(action, "minecraft:entity.player.attack.strong");
            WorldFeedback.emit(world, gunkshotScene, 1, origin,
                { moment: "blast", direction: [launch.x(), launch.y(), launch.z()], chunks: chunks, scale: scale, intensity: intensity }, 18);
            const flight = LivingActions.projectile(action, {
                speed: speed, range: flightRange, radius: radius, gravity: 0, lifetime: 140,
                direction: launch,
                appearance: { sprite: "cobblemon:generic/goo/ooze", tint: 0x6E8C3A, glow: false,
                    scale: Math.max(0.7, radius / 0.26) },
                impact: function (current: CombatAction, hit: CombatImpact) {
                    if (hit.hitEntity()) connect(current, hit);
                    else miss(current, hit.position(), true, hit.blockFace());
                }
            }, function (current: CombatAction) {
                // 空飞到期：落在真实出膛方向算出的轨迹末端，不用准星点伪补。
                miss(current, rangeEnd, false, "");
            });
            scenes.show(action, "flight", origin, { moment: "flight", projectile: flight, chunks: chunks, scale: scale, intensity: intensity });
        }
    });
}
