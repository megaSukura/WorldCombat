/**
 * 蛮力 / superpower 的出手方式。
 *
 * 核心念头：**沉肩突进**——沉肩扎马后沿自由瞄准锁定的 3D 方向贴地短冲，真实撞到第一个身体才砸实一记；
 *   撞中后重心散了，自身攻击与防御各降一级。墙前与空处只会冲出一蓬灰，不结算也不付代价。
 *
 * 三幕（提交前只播预告）：
 *   起（charge）：沉肩扎马，脚边尘土被吸拢、拳边聚起暖光，只播预告，此时代价未结清。
 *   冲（rush → impact / wall）：提交后沿锁定方向逐刻用原生 `sweepStep`/`moveSweep` 短冲，最远 `reach`；
 *       首个接触的真实敌人结算一次 `ram` 接触伤害（原参数按该命中者求值），沿接触方向撞开 `jolt`（目标体重扣减）；
 *       墙或空处只在真实接触点扬一次尘收势，不换方块、不自降攻防。
 *       震荡式（配置 aftershock）额外在真实接触点对通视的邻近敌人以 `share` 保留荡一圈 `crush` 余震，不重复伤主目标。
 *   沉（slump）：命中后重心散掉，自身攻击 −`attackLoss`、防御 −`guardLoss`，肩膀落下两缕灰气并浮字提示。
 *
 * 与同族分开：鳞射是远距多段、火焰鞭是长鞭剥对手甲、鳞片噪音是环身声爆；
 *   蛮力是近身单体最重的一记，唯一让自身攻防一起下降，并坚持到真实首碰才结算。
 *
 * 配置 `aftershock` 由公式改威力／半径／时序，由本文件改余震结算；提交后才触碰世界。
 * 选取 `kind:"aim"`：方向、世界点或任意阵营实体都能放，可向空处短冲；攻击许可仍由命中层裁定。
 */
namespace PokemonSkills {
    const superpowerScene = "world_combat:move_superpower";
    const superpowerSlumpText = "world_combat.move.superpower.text.slump";
    const superpowerMissText = "world_combat.move.superpower.text.miss";

    /** 只把接触到的地面/墙面材质归到一个尘土色，用于画面；不改动任何世界方块。 */
    function superpowerMaterialTint(id: string): number {
        const value = String(id);
        if (value.indexOf("deepslate") >= 0) return 0x5A5A62;
        if (value.indexOf("sand") >= 0) return 0xC9B27A;
        if (value.indexOf("netherrack") >= 0) return 0x7A3A32;
        if (value.indexOf("snow") >= 0 || value.indexOf("ice") >= 0) return 0xB8D4E8;
        if (value.indexOf("grass") >= 0 || value.indexOf("moss") >= 0) return 0x6E8C46;
        if (value.indexOf("dirt") >= 0 || value.indexOf("mud") >= 0) return 0x8C6A44;
        if (value.indexOf("gravel") >= 0) return 0x9A948C;
        if (value.indexOf("wood") >= 0 || value.indexOf("planks") >= 0) return 0x9A7A4A;
        if (value.indexOf("stone") >= 0 || value.indexOf("cobble") >= 0 || value.indexOf("rock") >= 0) return 0x8A8A8A;
        return 0x8C7448;
    }

    /** 读真实接触方块格的材质色；没有具体方块接触时用中性土色。 */
    function superpowerContactTint(world: CombatWorld, contact: CombatImpact): number {
        const cell = contact.blockPosition();
        if (cell === null) return 0x8C7448;
        const block = world.block(cell);
        return block === null ? 0x8C7448 : superpowerMaterialTint(String(block.id()));
    }

    define({
        freeMovement: true,
        id: "superpower",
        cooldownParameter: "recharge",
        name: "Superpower",
        description: "沉肩扎马，沿瞄准方向贴地短冲，真实撞到第一个身体才砸出一记单体物理重击并把目标撞开；命中后自身攻击与防御各下降。撞墙或冲空只扬一蓬灰、不付代价。震荡式在真实接触点多荡一圈余震，代价是单发更轻、防御再降一级、出手更慢。",
        uses: ["贴身用一记最重的单发把对手打残", "把对手从阵地里撞开", "震荡式一次震开挤在接触点周围的一群人"],
        kind: "aim",
        range: 3.2,
        maxRange: 5.4,
        prepare: 12,
        active: 0,
        recover: 10,
        cooldown: 40,
        maximumTicks: 220,
        style: "impact",
        defaults: { aftershock: false, ai: { maxChase: 7, finish: true, minHealth: 0 } },
        fields: [],
        indicator: function (config, pokemon) {
            return { radius: pokemon ? p("superpower", "reach", pokemon) : 3.2, geometry: "line", style: "impact",
                color: 0xC46A3A, label: config && config.aftershock === true ? "蛮力·震荡式" : "蛮力·贯穿式" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills["superpower"], detail: { values: config },
                world: world || null, actor: actor || null, attributes };
            return {
                prepare: Math.round(p("superpower", "tempo", context)),
                recover: Math.round(p("superpower", "aftercast", context)),
                cooldown: Math.round(p("superpower", "recharge", context)),
                active: 0,
                range: p("superpower", "reach", context)
            };
        },
        windup: function (action, config, prepare) {
            action.present("world_combat:move_superpower:charge", superpowerScene, 1, action.origin(),
                JSON.stringify({ moment: "charge", aftershock: config && config.aftershock === true ? 1 : 0,
                    power: Math.round(p("superpower", "ram", action)) }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const world = action.world();
            const actor = action.actor();
            const self = world.observe(actor);
            const start = self !== null ? self.position() : action.origin();
            const raw = aim(action);
            const direction = raw.length() < 1e-6 ? action.direction() : raw.unit();
            const reach = p("superpower", "reach", action);
            const rush = Math.max(0.25, p("superpower", "rush", action));
            const girth = Math.max(0.3, Math.min(1.0, p("superpower", "girth", action)));
            const aftershock = !!(config && config.aftershock);
            const crush = p("superpower", "crush", action);
            const share = p("superpower", "share", action);
            const attackLoss = Math.max(0, Math.round(p("superpower", "attackLoss", action)));
            const guardLoss = Math.max(0, Math.round(p("superpower", "guardLoss", action)));
            const chargePower = p("superpower", "ram", action);
            const intensity = Math.max(0.5, Math.min(2.4, chargePower / 120));
            const heading = [direction.x(), direction.y(), direction.z()];
            const scenes = WorldFeedback.actionScenes(superpowerScene);
            let travelled = 0, settled = false;

            function finish(current: CombatAction): void { if (settled) return; settled = true; scenes.finish(current, done); }

            sound(action, "cobblemon:move.closecombat.actor_1");
            scenes.show(action, "rush", start, { moment: "rush", direction: heading, intensity: intensity });

            /** 墙前或空处的真实接触点：扬一次与材质同色的尘收势，不换方块、不结算、不自降。 */
            function halt(current: CombatAction, at: CombatPoint, contact: CombatImpact | null): void {
                const scope = current.world();
                const blocked = contact !== null && contact.blocked();
                const face = contact !== null ? contact.blockFace() : "";
                const tint = contact !== null && blocked ? superpowerContactTint(scope, contact) : 0x8C7448;
                scenes.stop(current, "rush");
                WorldFeedback.emit(scope, superpowerScene, 1, at,
                    { moment: "wall", face: face, materialTint: tint, direction: heading, intensity: intensity,
                        dust: Math.round(14 + Math.max(0, at.minus(start).length()) * 3) }, 18);
                WorldFeedback.text(scope, at.plus(WorldCombat.point(0, 1.2, 0)), superpowerMissText, [], 24);
                sound(current, "minecraft:entity.player.attack.weak");
                finish(current);
            }

            /** 撞到真实敌人：只在这一刻结算主击，并按真实命中者求值；命中才付攻防双降。 */
            function connect(current: CombatAction, contact: CombatImpact, victim: CombatActor): void {
                const scope = current.world();
                const at = contact.position();
                const victimRef = String(victim.ref());
                const hitContext = withTarget(factContext(current), victim);
                const ram = p("superpower", "ram", hitContext);
                const jolt = p("superpower", "jolt", hitContext);
                const landed = impact(current, contact, "superpower", ram,
                    { damage: damageSpec("superpower", "ram"), contact: true });
                const tint = superpowerContactTint(scope, contact);
                let extra = 0;
                if (landed) {
                    // 撞飞服从原生受击位移返回，不为沉重目标追加穿透位移。
                    if (scope.valid(victim)) {
                        const away = WorldCombat.point(at.x() - start.x(), 0, at.z() - start.z());
                        if (away.length() > 0.05) scope.hitDisplace(victim, away.unit().scale(jolt));
                    }
                    // 震荡式：从真实接触点对通视的邻近敌人保留结算，不重复伤原主目标。
                    if (aftershock && crush > 0) {
                        WorldGeometry.selectEnemies(scope, WorldGeometry.ring(at, 0, crush, { below: 2.0, above: 3.0 }),
                            function (other, facts) {
                                if (String(other.ref()) === victimRef) return;
                                if (!scope.clear(at, facts.position())) return;
                                if (!hurt(current, other, "superpower", ram * share, { damage: damageSpec("superpower", "ram") })) return;
                                extra++;
                                const awayOther = WorldCombat.point(facts.position().x() - at.x(), 0, facts.position().z() - at.z());
                                if (scope.valid(other) && awayOther.length() > 0.05)
                                    scope.hitDisplace(other, awayOther.unit().scale(jolt * 0.8));
                            });
                    }
                    NativeEffects.boost(scope, actor, "atk", -attackLoss);
                    NativeEffects.boost(scope, actor, "def", -guardLoss);
                }
                scenes.stop(current, "rush");
                WorldFeedback.emit(scope, superpowerScene, 1, at,
                    { moment: "impact", target: victimRef, landed: landed ? 1 : 0, extra: extra, aftershock: aftershock ? 1 : 0,
                        materialTint: tint, face: contact.blockFace(), intensity: intensity,
                        power: Math.round(ram), shock: aftershock ? Math.round(8 + crush * 4) : 0,
                        dust: Math.round(16 + ram * 0.18 + extra * 10) }, 28);
                if (landed) {
                    const after = scope.observe(actor);
                    const above = (after !== null ? after.position() : at).plus(WorldCombat.point(0, 1.3, 0));
                    WorldFeedback.emit(scope, superpowerScene, 1, above,
                        { moment: "slump", attackLoss: attackLoss, guardLoss: guardLoss,
                            fatigue: Math.round(10 + (attackLoss + guardLoss) * 6), intensity: intensity }, 22);
                    WorldFeedback.text(scope, above, superpowerSlumpText, [attackLoss, guardLoss], 30);
                    sound(current, "cobblemon:impact.fighting");
                } else {
                    WorldFeedback.text(scope, at.plus(WorldCombat.point(0, 1.2, 0)), superpowerMissText, [], 24);
                    sound(current, "minecraft:entity.player.attack.weak");
                }
                finish(current);
            }

            /** 沿锁定方向逐刻短冲：真实身体扫到首个敌人就结算，墙/友方/空处都只收势。 */
            function advance(current: CombatAction): void {
                const scope = current.world();
                const remaining = reach - travelled;
                if (remaining <= 0.02) { halt(current, current.origin(), null); return; }
                const step = Math.min(rush, remaining);
                const swept = sweepStep(current, direction.scale(step), girth), contact = swept.hit;
                if (contact.hitEntity()) {
                    const victim = contact.target();
                    if (victim !== null && scope.valid(victim) && !scope.friendly(victim)) { connect(current, contact, victim); return; }
                    halt(current, contact.position(), contact);
                    return;
                }
                travelled += swept.moved;
                if (contact.blocked() || swept.moved <= 0.001) { halt(current, contact.position(), contact); return; }
                if (travelled >= reach - 0.02) { halt(current, current.origin(), null); return; }
                current.after(1, advance);
            }

            advance(action);
        }
    });
}
