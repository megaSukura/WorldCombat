/**
 * 闪焰冲锋 / flareblitz 的出手方式。
 *
 * 核心念头：把自己整个点着的一次不刹车长冲——火焰从脚下烧到全身、越跑越旺，低头笔直撞出去；
 * 撞实的一刻火全部灌进对方（概率灼伤），目标被顶飞、自己按比例反伤，身后的地面上还拖着一条烧着的火线。
 * 它是本族里冲得最远、撞得最重、也最伤自己的一招。
 *
 * 选取 `kind: "aim"`：自由方向或世界点都能起冲，也能空放；提交后不再要求存在敌人，AI 提交的敌方目标只是
 * 更可能撞上的输入。首个被原生身体扫到的可命中活体才结算，友方与方块照常只挡路。
 *
 * 三幕：
 *   燃（windup，提交前）：火焰从脚下收拢到全身，只播预告。
 *   冲（charge → wake）：提交后逐刻沿瞄准方向推进，身周的火随路程越烧越旺，身后留一条余焰。
 *   撞（impact / skid）：trace 撞上活体即按 blaze 结算接触伤害，按 burnChance 灌入灼伤（共享状态），
 *       只有实际造成伤害才按 recoil 反伤自己、把目标沿冲撞方向顶飞 shove 格，并停在接触点、不穿过目标；
 *       冲到底、撞墙或推不动就只是收势（skid），火在脚下熄灭——这一招冲空不自伤，也不留地面火场。
 *
 * 与同族分开：电光是贴身短促的一点电、火焰轮是蜷成火轮滚过去、伏特攻击是蓄电后爆冲并放电波及旁人；
 * 闪焰冲锋独有的是一条拖得很长的火线，玩家凭它一眼认出这一招。配置 afterburn（余焰式）由 resolve
 * 改时序、由公式改威力/反伤/灼伤/击退，提交后才触碰世界。
 */
namespace PokemonSkills {
    const flareblitzScene = "world_combat:move_flareblitz";
    const flareblitzHitText = "world_combat.move.flareblitz.text.hit";
    const flareblitzSkidText = "world_combat.move.flareblitz.text.skid";
    const flareblitzBurnText = "world_combat.move.flareblitz.text.burn";
    const flareblitzRecoilText = "world_combat.move.flareblitz.text.recoil";

    define({
        freeMovement: true,
        id: "flareblitz",
        cooldownParameter: "recharge",
        name: "Flare Blitz",
        description: "朝瞄准方向全身着火冲出去，撞到的第一个敌人受到伤害、被顶飞并有机会灼伤；只有真的撞伤目标才按比例反伤自己。",
        uses: ["用一记燃烧的冲锋把贴脸的对手撞开", "给一个还没被烧的主力点上灼伤", "在开阔地把目标一路顶到队友或高台边上"],
        kind: "aim",
        range: 5.4,
        maxRange: 8.6,
        prepare: 9,
        active: 34,
        recover: 10,
        cooldown: 48,
        style: "fire",
        defaults: { afterburn: false, ai: { maxChase: 11, minHealth: 0.28 } },
        fields: [],
        indicator: function (config, pokemon) {
            return { radius: p("flareblitz", "radius", pokemon) * 1.8, geometry: "line", style: "fire",
                color: 0xF2601E, label: config && config.afterburn === true ? "余焰式闪焰冲锋" : "闪焰冲锋" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills["flareblitz"], detail: { values: config }, world: world || null, actor: actor || null, attributes };
            return {
                prepare: Math.round(p("flareblitz", "tempo", context)),
                recover: Math.round(p("flareblitz", "aftercast", context)),
                cooldown: Math.round(p("flareblitz", "recharge", context)),
                active: skills["flareblitz"].active,
                range: p("flareblitz", "charge", context) + 0.5
            };
        },
        windup: function (action, config, prepare) {
            action.present("world_combat:move_flareblitz:ignite", flareblitzScene, 1, action.origin(),
                JSON.stringify({ moment: "ignite", afterburn: !!(config && config.afterburn) }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const movementScenes = WorldFeedback.actionScenes(flareblitzScene);
            const world = action.world();
            const actor = action.actor();
            const length = p("flareblitz", "charge", action);
            const pace = p("flareblitz", "pace", action);
            const radius = p("flareblitz", "radius", action);
            const traceAhead = p("flareblitz", "traceAhead", action);
            const minimumMove = p("flareblitz", "minimumMove", action);
            const power = p("flareblitz", "blaze", action);
            const recoil = p("flareblitz", "recoil", action);
            const chance = p("flareblitz", "burnChance", action);
            const burnTicks = Math.round(p("flareblitz", "burnTicks", action));
            const shove = p("flareblitz", "shove", action);
            const embers = Math.round(p("flareblitz", "embers", action));
            // 贴地冲锋：把瞄准方向压成水平，避免零点几格的垂直分量让身体扫到脚下的地面而被挡停。
            const aimed = aim(action);
            const level = WorldCombat.point(aimed.x(), 0, aimed.z());
            const flat = level.length() > 0.001 ? level : WorldCombat.point(action.direction().x(), 0, action.direction().z());
            const direction = flat.length() > 0.001 ? flat.unit() : WorldCombat.point(0, 0, 1);
            // 方向已冻结：目标此后离场或死亡都不再中断这一冲，空放沿提交朝向继续。
            action.releaseTarget();
            const scale = radius / 0.56;
            const intensity = Math.max(0.6, Math.min(2.4, power / 120));
            const start = action.origin();
            const end = start.plus(direction.scale(length));
            let travelled = 0, settled = false;

            sound(action, "cobblemon:move.flamecharge.actor");
            CombatStatus.cure(world, actor, "frozen");
            movementScenes.show(action, "charge", start, { moment: "charge", direction: [direction.x(), direction.y(), direction.z()],
                    path: [[start.x(), start.y(), start.z()], [end.x(), end.y(), end.z()]],
                    embers: embers, scale: scale, intensity: intensity });

            function finish(current: CombatAction): void { if (!settled) { settled = true; movementScenes.finish(current, done); } }

            /** 冲空：火在脚下熄灭，不自伤；留一道散去的火星与文字。 */
            function skid(current: CombatAction): void {
                const scope = current.world(), body = scope.observe(current.actor());
                if (body !== null) {
                    WorldFeedback.emit(scope, flareblitzScene, 1, body.position(),
                        { moment: "skid", embers: embers, scale: scale, intensity: intensity * 0.7 }, 24);
                    WorldFeedback.text(scope, body.position().plus(WorldCombat.point(0, 1.3, 0)), flareblitzSkidText, [], 24);
                }
                sound(current, "minecraft:block.fire.extinguish");
                finish(current);
            }

            function advance(current: CombatAction): void {
                const scope = current.world(), origin = current.origin();
                const step = Math.min(pace, Math.max(0, length - travelled));
                if (step <= 0.001) { skid(current); return; }
                const delta = direction.scale(step);
                const swept = sweepStep(current, delta, radius), hit = swept.hit;
                if (hit.hitEntity()) {
                    const target = hit.target(), point = hit.position();
                    const already = target !== null && scope.valid(target) && CombatStatus.has(scope, target, "burn");
                    const landed = impact(current, hit, "flareblitz", power,
                        { damage: damageSpec("flareblitz", "blaze"), contact: true, recoil: recoil,
                            status: already ? "" : "burn", chance: already ? 0 : chance, statusTicks: burnTicks });
                    WorldFeedback.emit(scope, flareblitzScene, 1, point,
                        { moment: "impact", target: target ? String(target.ref()) : "", embers: embers, scale: scale,
                            intensity: Math.max(0.6, Math.min(2.4, power / 115)), burn: already ? 0 : 1 }, 32);
                    sound(current, "cobblemon:move.flamecharge.target");
                    sound(current, "cobblemon:impact.fire");
                    // 只有这次接触真的造成了伤害才顶飞、点着、反伤；伤害被拒时接触表现保留，但不声称命中，也不反伤。
                    if (landed && target !== null && scope.valid(target)) {
                        scope.hitDisplace(target, direction.scale(shove));
                        WorldFeedback.text(scope, point.plus(WorldCombat.point(0, 1.4, 0)), flareblitzHitText, [], 28);
                        if (!already && CombatStatus.has(scope, target, "burn"))
                            WorldFeedback.text(scope, point.plus(WorldCombat.point(0, 1.9, 0)), flareblitzBurnText, [], 30);
                        const self = scope.observe(actor);
                        if (self !== null) {
                            WorldFeedback.emit(scope, flareblitzScene, 1, self.position(),
                                { moment: "recoil", embers: Math.round(embers * 0.6), scale: scale,
                                    intensity: Math.max(0.5, Math.min(2.4, power * recoil / 55)) }, 26);
                            WorldFeedback.text(scope, self.position().plus(WorldCombat.point(0, 1.3, 0)), flareblitzRecoilText, [], 24);
                        }
                        sound(current, "minecraft:entity.player.hurt_on_fire");
                    }
                    finish(current);
                    return;
                }
                // 没撞到可命中活体：只走原生实际推进的距离，绝不用剩余预算穿过任何接触。
                travelled += swept.moved;
                if (hit.blocked() || swept.moved < minimumMove || travelled >= length) { skid(current); return; }
                movementScenes.show(current, "wake", origin, { moment: "wake", embers: embers, scale: scale, intensity: intensity });
                current.after(1, advance);
            }

            advance(action);
        }
    });
}
