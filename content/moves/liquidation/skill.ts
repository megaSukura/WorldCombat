/**
 * 水流裂破 / liquidation 的出手方式。
 *
 * 念头的形状：把水压成一层贴身的窄刃（windup，提交前只播预告）→ 提交后先向前踏出半步（step）→
 * 以踏到的身体位置为心，沿瞄准方向张开一个扇形，水刃贴着身体**由一侧扫向另一侧**（blade）；
 * 刃段扫到谁，谁才吃这一记 `impact`（打伤、按径向顶开、留下湿身），并有概率顺着裂口把防御压下一级、
 * 留下共享身份 `world_combat:status/sundered`（护甲已被撕开，别的单元可以消费），谁都不会被同一趟扫中两次。
 * 逐段用 `action.trace` 判墙体遮挡：隔墙的人这一趟擦不到。目标若已带湿身，本次不再重复挂湿。
 * 选取 aim：点方向或实体都可，空点可以挥空；不再依赖直冲接近，正前的远敌不会被长冲贴上去。
 * 一幕半：blade 逐拍扫过 → hit/crack 只落在真正扫到的人身上。提交后才触碰世界。配置 shred 通过 resolve 改变时序。
 */
namespace PokemonSkills {
    const liquidationScene = "world_combat:move_liquidation";
    const LiquidationSoaked = "world_combat:liquidation_soaked";
    const LiquidationSundered = "world_combat:liquidation_sundered";
    const liquidationHitText = "world_combat.move.liquidation.text.hit";
    const liquidationCrackText = "world_combat.move.liquidation.text.crack";
    const liquidationMissText = "world_combat.move.liquidation.text.miss";

    define({
        freeMovement: true,
        id: "liquidation",
        name: "Liquidation",
        description: "把水压成一层贴身的窄刃，向前踏出半步后由一侧向另一侧横扫：擦到的每个目标都打伤、顶开、留下湿身，并有概率顺着裂口把防御压低；施放者身处雨中时水压更重。",
        uses: ["短前踏后横切眼前一排身体", "撕开硬目标的护甲", "给目标挂上湿身，留给后续的水属性招式"],
        kind: "aim",
        range: 4,
        maxRange: 7,
        prepare: 7,
        active: 30,
        recover: 9,
        cooldown: 40,
        style: "water",
        defaults: { shred: false, ai: { maxChase: 6, crack: true, crowd: true } },
        fields: [],
        indicator: function (config, pokemon) {
            return { radius: (pokemon ? p("liquidation", "reach", pokemon) + p("liquidation", "step", pokemon) : 3.6), geometry: "cone", style: "water", color: 0x4FA8E0, label: "水流裂破" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon: pokemon, skill: skills["liquidation"], detail: { values: config }, world: world, actor: actor, attributes: attributes };
            const shred = !!(config && config.shred);
            return {
                prepare: p("liquidation", "prepare", context) + (shred ? 3 : 0),
                recover: p("liquidation", "recover", context),
                cooldown: p("liquidation", "cooldown", context) + (shred ? 8 : 0),
                range: p("liquidation", "step", context) + p("liquidation", "reach", context) + 0.4
            };
        },
        windup: function (action, config, prepare) {
            action.present("world_combat:move_liquidation:windup", liquidationScene, 1, action.origin(),
                JSON.stringify({ moment: "windup", shred: !!(config && config.shred) }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const movementScenes = WorldFeedback.actionScenes(liquidationScene);
            const world = action.world();
            const actor = action.actor();
            const step = p("liquidation", "step", action);
            const reach = p("liquidation", "reach", action);
            const sweep = p("liquidation", "sweepAngle", action);
            const ticks = Math.max(2, Math.round(p("liquidation", "sweepTicks", action)));
            const radius = p("liquidation", "bladeThickness", action);
            const power = p("liquidation", "crash", action);
            const chance = p("liquidation", "shredChance", action);
            const stages = Math.max(1, Math.round(p("liquidation", "shredStages", action)));
            const soakTicks = Math.max(20, Math.round(p("liquidation", "soakTicks", action)));
            const push = p("liquidation", "push", action);
            const direction = WorldGeometry.flatUnit(action.targetPosition().minus(action.origin()), action.direction());
            const scale = radius / 0.42;
            const intensity = Math.max(0.5, Math.min(2.2, power / 85));
            const half = sweep * Math.PI / 360, slice = 2 * half / ticks;
            const base = Math.atan2(direction.x(), direction.z());
            const selfRef = String(actor.ref());
            let settled = false, hits = 0;

            function headingAt(angle: number): CombatPoint {
                return WorldCombat.point(Math.sin(base + angle), 0, Math.cos(base + angle));
            }

            function finish(current: CombatAction): void {
                if (settled) return;
                settled = true;
                const scope = current.world();
                const self = scope.observe(actor);
                if (self !== null) {
                    if (hits === 0)
                        WorldFeedback.emit(scope, liquidationScene, 1, self.position(), { moment: "miss", scale: scale, intensity: intensity }, 20);
                    else
                        WorldFeedback.text(scope, self.position().plus(WorldCombat.point(0, 1.3, 0)), liquidationHitText, [], 22);
                }
                sound(current, hits > 0 ? "cobblemon:impact.water" : "minecraft:entity.generic.splash");
                movementScenes.finish(current, done);
            }

            /** 逐拍扫过一段刃：刃段真正到达的每个目标才结算一次，隔墙的擦不到。 */
            function advance(current: CombatAction, beat: number, next: number, foes: { ref: string; bearing: number }[],
                struck: { [ref: string]: boolean }, centre: CombatPoint): void {
                if (settled) return;
                if (beat >= ticks) { finish(current); return; }
                const scope = current.world();
                const angleNow = -half + slice * (beat + 1);
                const heading = headingAt(angleNow);
                while (next < foes.length && foes[next].bearing <= angleNow) {
                    const ref = foes[next].ref; next++;
                    if (struck[ref]) continue;
                    struck[ref] = true;
                    const enemy = scope.actor(ref);
                    if (enemy === null || !scope.valid(enemy) || scope.friendly(enemy)) continue;
                    const facts = scope.observe(enemy);
                    if (facts === null) continue;
                    // 墙体 / 别的身体遮挡每段各自判定：真正挡在中间才擦不到。
                    const probe = current.trace(centre, facts.position(), radius, true);
                    const wall = !probe.hitEntity() && probe.blocked();
                    const other = probe.hitEntity() && (probe.target() === null || String(probe.target()!.ref()) !== ref);
                    if (wall || other) continue;
                    const landed = hurt(current, enemy, "liquidation", power, { damage: damageSpec("liquidation", "crash"), contact: true });
                    if (!landed || !scope.valid(enemy)) continue;
                    hits++;
                    WorldFeedback.emit(scope, liquidationScene, 1, facts.position(),
                        { moment: "hit", target: ref, scale: scale, intensity: intensity, bursts: Math.round(16 + power * 0.2) }, 24);
                    const away = WorldCombat.point(facts.position().x() - centre.x(), 0, facts.position().z() - centre.z());
                    scope.hitDisplace(enemy, (away.length() < 0.01 ? heading : away.unit()).scale(push));
                    if (!CombatStatus.has(scope, enemy, "soaked"))
                        CombatStatus.apply(scope, enemy, "soaked", LiquidationSoaked, soakTicks);
                    if (scope.random() < chance) {
                        NativeEffects.boost(scope, enemy, "def", -stages);
                        CombatStatus.apply(scope, enemy, "sundered", LiquidationSundered, soakTicks, 0, { unique: true });
                        WorldFeedback.emit(scope, liquidationScene, 1, facts.position(),
                            { moment: "crack", target: ref, stages: stages, spokes: stages * 10, scale: scale }, 26);
                        WorldFeedback.text(scope, facts.position().plus(WorldCombat.point(0, 1.4, 0)), liquidationCrackText, [stages], 26);
                        sound(current, "minecraft:block.glass.break");
                    }
                }
                // 水刃当前段与已扫过的轨迹同用一份 position/direction，画面读到的就是真正扫过的位置。
                movementScenes.show(current, "blade", centre,
                    { moment: "blade", direction: [heading.x(), 0, heading.z()], sweep: Math.round(sweep),
                        blade: Math.round(slice * 2.2 * 180 / Math.PI), reach: reach, scale: scale,
                        intensity: intensity, progress: (beat + 1) / ticks });
                current.after(1, function (following: CombatAction) { advance(following, beat + 1, next, foes, struck, centre); });
            }

            const body = world.observe(actor);
            if (body === null) { finish(action); return; }
            // 短前踏：真实位移决定水刃的原点，不再有长直冲追赶。
            const before = body.position();
            const moved = step > 0.01 ? world.displace(actor, direction.scale(step)) : 0;
            const after = world.observe(actor);
            const centre = after !== null ? after.position() : before;
            WorldFeedback.emit(world, liquidationScene, 1, centre,
                { moment: "step", scale: scale, intensity: intensity, moved: Math.round(moved * 100) / 100 }, 18);
            // 先量出扇内每个目标的方位，由一侧向另一侧扫时逐个触发（每人只吃一次）。
            const foes: { ref: string; bearing: number }[] = [];
            WorldGeometry.selectEnemies(world, WorldGeometry.sector(centre, direction, reach, sweep, { below: 1.6, above: 2.6 }), function (enemy, facts) {
                if (String(enemy.ref()) === selfRef) return;
                let bearing = Math.atan2(facts.position().x() - centre.x(), facts.position().z() - centre.z()) - base;
                while (bearing > Math.PI) bearing -= Math.PI * 2;
                while (bearing < -Math.PI) bearing += Math.PI * 2;
                if (Math.abs(bearing) <= half + 0.05) foes.push({ ref: String(enemy.ref()), bearing: bearing });
            });
            foes.sort(function (a, b) { return a.bearing - b.bearing; });
            sound(action, "cobblemon:move.waterpulse.actor");
            advance(action, 0, 0, foes, {}, centre);
        }
    });
}
