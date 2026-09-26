/**
 * 下压踢 / axekick 的出手方式。
 *
 * 核心念头：一次短垫步后原地抬腿高劈、脚踵直落的两拍动作。先朝准心垫一小步站定，把腿抬到高处（亮给对手看，
 * 是对手读得到的预告），再一脚踵朝下劈进面前一条固定的窄竖带；劈中会砸乱对手的架势，有概率把它劈得恍惚。
 * 竖带空着，脚踵才砸地、自伤一截。它不再把整个人抛出去，是跳击家族里最贴地、自伤最轻的一招，
 * 签名是那条抬起→直落的斧劈线。
 *
 * 三幕（提交后由共享节奏驱动 execute）：
 *   起（windup，提交前）：抬腿蓄势，只播预告，可免费打断。
 *   抬（step → raise）：朝准心短垫一步（撞墙即停），站定亮出面前固定的窄竖带 telegraph 刻。
 *   劈（chop）：竖带区域取第一个非友方真实接触者，按 chop 结算接触伤害、掷一次 dazeChance 决定是否把震撼
 *       挂成本单元的恍惚载体（共享身份 world_combat:status/confusion）、并撞开 shove 格；竖带空着就脚踵砸地，
 *       按 crash 自伤。不凭旧 target 补中，也不把整个人送出去。
 *
 * 选取 `kind: "aim"`：朝自由方向或世界点抬腿都行，target 为 null、目标离场、空劈都成立；方向交给 aim()。
 *
 * 恍惚行为（本单元写）：被劈晕的目标每次试图出手按载体振幅掷骰、中则本次出手作废；
 * 它打中非友方时按自身攻击结算一道自伤。消费方用 CombatStatus.has(world, actor, "confusion") 按身份读取。
 *
 * 对宝可梦、原版生物、其他模组生物和玩家，伤害（hurt → PokemonDamage）、位移（world.displace）与状态
 * （真实 MC MobEffect）都走同一条路。
 */
namespace PokemonSkills {
    const axekickScene = "world_combat:move_axekick";
    const axekickRing = "world_combat:axekick_ring";
    const axekickHitText = "world_combat.move.axekick.text.hit";
    const axekickCrashText = "world_combat.move.axekick.text.crash";
    const axekickDazeText = "world_combat.move.axekick.text.daze";
    const axekickRecoilFraction = 0.05;

    /** 从某点脚下向下找到最近地表的顶面高度；找不到就返回该点脚底的高度。 */
    function axekickFloor(world: CombatWorld, point: CombatPoint, halfHeight: number): number {
        const feet = point.y() - halfHeight;
        for (let step = 0; step <= 24; step++) {
            const block = world.block(WorldCombat.point(point.x(), feet - step, point.z()));
            if (block === null) break;
            const id = String(block.id());
            if (id === "minecraft:air" || id === "minecraft:cave_air" || id === "minecraft:void_air") continue;
            return Math.floor(feet - step) + 1;
        }
        return feet;
    }

    function axekickGround(world: CombatWorld, point: CombatPoint, halfHeight: number): CombatPoint {
        return WorldCombat.point(point.x(), axekickFloor(world, point, halfHeight), point.z());
    }

    function axekickAbove(point: CombatPoint): CombatPoint { return point.plus(WorldCombat.point(0, 1.1, 0)); }

    /** 本单元自己的恍惚载体：只有当代表载体就是本单元的 id 时，本单元的行为才接管。 */
    function axekickCarrier(world: CombatWorld, actor: CombatActor): CombatMobEffect | null {
        const effect = CombatStatus.representative(world, actor, "confusion");
        return effect !== null && String(effect.id()) === axekickRing ? effect : null;
    }

    define({
        freeMovement: true,
        id: "axekick",
        cooldownParameter: "recharge",
        name: "Axe Kick",
        description: "朝任意方向短垫一步后原地抬腿，脚跟沿一条固定的窄竖带往下劈，命中造成伤害并有几率使目标恍惚；竖带空着时脚踵砸地、自己受伤。",
        uses: ["用一记直落的下劈砸穿硬目标", "给刚起手或刚增益的对手一记恍惚", "贴脸时用最轻自伤的一记收尾"],
        kind: "aim",
        range: 4.0,
        maxRange: 6.5,
        prepare: 7,
        active: 30,
        recover: 9,
        cooldown: 28,
        style: "aerial",
        maximumTicks: 220,
        interruptible: false,
        defaults: { high: false, ai: { maxChase: 8, spareConfused: true } },
        fields: [],
        indicator: function (config, pokemon) {
            return { radius: p("axekick", "reach", pokemon), geometry: "line", style: "aerial", color: 0x9B6BE0,
                label: config && config.high === true ? "高劈" : "低位快劈" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills["axekick"], detail: { values: config }, world: world || null, actor: actor || null, attributes };
            return {
                prepare: Math.round(p("axekick", "tempo", context)),
                recover: Math.round(p("axekick", "aftercast", context)),
                cooldown: Math.round(p("axekick", "recharge", context)),
                range: p("axekick", "reach", context)
            };
        },
        windup: function (action, config, prepare) {
            action.present("axekick:windup", axekickScene, 1, action.origin(),
                JSON.stringify({ moment: "windup", high: config && config.high === true ? 1 : 0 }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const movementScenes = WorldFeedback.actionScenes(axekickScene);
            const world = action.world();
            const actor = action.actor();
            const self = world.observe(actor);
            if (self === null) { movementScenes.finish(action, done); return; }

            action.releaseTarget();
            const heading = WorldGeometry.flatUnit(aim(action), action.direction());
            const step = Math.max(0.2, p("axekick", "step", action));
            const reach = Math.max(1.2, p("axekick", "reach", action));
            const bandHeight = Math.max(0.8, p("axekick", "hopHeight", action));
            const halfWidth = Math.max(0.2, p("axekick", "hitRadius", action));
            const hopSpeed = Math.max(0.45, p("axekick", "hopSpeed", action));
            const chopSpeed = Math.max(0.4, p("axekick", "chopSpeed", action));
            // 抬腿/下劈越快，对应表现的动画越短——速度直接接到客户端 moment 时长。
            const raiseTicks = Math.max(6, Math.round(16 / hopSpeed));
            const chopTicks = Math.max(5, Math.round(16 / chopSpeed));
            const telegraph = Math.max(1, Math.round(p("axekick", "telegraph", action)));
            const power = p("axekick", "chop", action);
            const crash = Math.max(0.03, Math.min(0.6, p("axekick", "crash", action)));
            const shove = Math.max(0, p("axekick", "shove", action));
            const dust = Math.max(4, Math.round(p("axekick", "dust", action)));
            const dazeChance = p("axekick", "dazeChance", action);
            const fumbleChance = p("axekick", "fumbleChance", action);
            const dazeTicks = Math.max(20, Math.round(p("axekick", "dazeTicks", action)));
            const scale = Math.max(0.5, Math.min(2, halfWidth / 0.42));
            const intensity = Math.max(0.6, Math.min(2.2, power / 120));
            const start = self.position();
            let finished = false;

            function finish(current: CombatAction): void { if (!finished) { finished = true; movementScenes.finish(current, done); } }

            /** 竖带中心的地面点：面前固定一处，脚下为基、沿准心偏移。 */
            function bandCentre(feet: CombatPoint): CombatPoint {
                const distance = 0.15 + reach * 0.5;
                return WorldCombat.point(feet.x() + heading.x() * distance, feet.y(), feet.z() + heading.z() * distance);
            }
            function bandTop(feet: CombatPoint): CombatPoint {
                const centre = bandCentre(feet);
                return WorldCombat.point(centre.x(), feet.y() + bandHeight, centre.z());
            }
            /** 判定区：竖带中心处，沿准心半长 reach/2、横切半宽 halfWidth、从地面向上 bandHeight。 */
            function bandRegion(feet: CombatPoint): WorldGeometry.Region {
                return WorldGeometry.box(bandCentre(feet), heading, WorldCombat.point(reach * 0.5, 0, halfWidth),
                    { below: 0.6, above: bandHeight });
            }

            sound(action, "cobblemon:move.aerialace.actor_1");

            function settle(current: CombatAction): void {
                movementScenes.stop(current);
                finish(current);
            }

            function daze(current: CombatAction, victim: CombatActor, at: CombatPoint): void {
                const live = current.world();
                const ticks = dazeTicks;
                if (live.random() >= dazeChance) return;
                if (!CombatStatus.apply(live, victim, "confusion", axekickRing, ticks, Math.round(fumbleChance * 100), { unique: true })) return;
                const body = live.observe(victim);
                const point = body === null ? at : body.position();
                WorldFeedback.emit(live, axekickScene, 1, point,
                    { moment: "daze", target: String(victim.ref()), scale: scale, chance: dazeChance,
                        intensity: Math.max(0.6, Math.min(2, dazeChance * 3)) }, 40);
                WorldFeedback.text(live, axekickAbove(point), axekickDazeText, [Math.round(ticks / 20)], 42);
                sound(current, "cobblemon:status.volatile.confusion.actor");
            }

            function crashLanding(current: CombatAction, at: CombatPoint): void {
                const live = current.world(), body = live.observe(actor);
                if (body !== null) {
                    live.health(actor, -body.maxHealth() * crash, "world_combat:crash");
                    WorldFeedback.emit(live, axekickScene, 1, at,
                        { moment: "crash", scale: scale, intensity: Math.max(0.6, Math.min(2.2, crash * 4)), dust: dust }, 24);
                    WorldFeedback.text(live, axekickAbove(at), axekickCrashText, [], 26);
                }
                sound(current, "minecraft:entity.generic.big_fall");
                current.after(5, function (next) { settle(next); });
            }

            function impactOn(current: CombatAction, victim: CombatActor, centre: CombatPoint): void {
                const live = current.world();
                const body = live.observe(victim);
                const point = body === null ? centre : body.position();
                if (!hurt(current, victim, "axekick", power, { damage: damageSpec("axekick", "chop"), contact: true })) {
                    crashLanding(current, centre); return;
                }
                if (live.valid(victim)) {
                    const me = live.observe(actor);
                    const away = me === null ? heading : point.minus(me.position());
                    const flat = WorldCombat.point(away.x(), 0, away.z());
                    const push = flat.length() < 0.01 ? heading : flat.unit();
                    live.displace(victim, push.scale(shove));
                }
                // 脚跟落在对手头顶：判定与表现都用同一个真实落点。
                const head = body === null ? centre : body.position().plus(WorldCombat.point(0, body.height() * 0.45, 0));
                WorldFeedback.emit(live, axekickScene, 1, head,
                    { moment: "impact", scale: scale, intensity: intensity, count: Math.round(18 + power * 0.35) }, 28);
                sound(current, "cobblemon:impact.fighting");
                sound(current, "minecraft:entity.player.attack.sweep");
                WorldFeedback.text(live, axekickAbove(point), axekickHitText, [], 26);
                if (live.valid(victim)) daze(current, victim, point);
                current.after(5, function (next) { settle(next); });
            }

            /** 短垫步：沿准心向前一小步，撞到实体或方块就停在原地，不把整个人送出去。 */
            function stepPhase(current: CombatAction): void {
                const live = current.world();
                const swept = sweepStep(current, heading.scale(step), 0.3);
                const hit = swept.hit;
                if (!hit.blocked() && !hit.hitEntity() && swept.remaining.length() > 0.001) live.displace(actor, swept.remaining);
                raise(current, 0);
            }

            /** 站定亮出竖带，等到 telegraph 刻才劈下——这段停顿是对手让开的窗口。 */
            function raise(current: CombatAction, wait: number): void {
                const live = current.world(), me = live.observe(actor);
                if (me === null) { finish(current); return; }
                const feet = me.position().minus(WorldCombat.point(0, me.height() * 0.5, 0));
                const centre = bandCentre(feet), top = bandTop(feet);
                movementScenes.show(current, "raise", feet, { moment: "raise", raiseTicks: raiseTicks,
                    path: [[centre.x(), centre.y(), centre.z()], [top.x(), top.y(), top.z()]],
                    scale: scale, intensity: intensity, dust: dust });
                if (wait >= telegraph) { chop(current, feet); return; }
                current.after(1, function (next) { raise(next, wait + 1); });
            }

            function chop(current: CombatAction, feet: CombatPoint): void {
                movementScenes.stop(current, "raise");
                const live = current.world();
                const centre = bandCentre(feet), top = bandTop(feet);
                movementScenes.show(current, "chop", centre, { moment: "chop", direction: [0, -1, 0], chopTicks: chopTicks,
                    point: [top.x(), top.y(), top.z()],
                    path: [[top.x(), top.y(), top.z()], [centre.x(), centre.y(), centre.z()]],
                    scale: scale, intensity: intensity });
                const region = bandRegion(feet);
                let victim: CombatActor | null = null, best = 1e9;
                WorldGeometry.selectEnemies(live, region, function (candidate, facts) {
                    if (String(candidate.ref()) === String(actor.ref())) return;
                    // 方块遮断脚路：到接触点没有直视线就不算劈到。
                    if (!live.clear(feet.plus(WorldCombat.point(0, 0.4, 0)), facts.position())) return;
                    const gap = facts.position().minus(feet).length();
                    if (gap < best) { best = gap; victim = candidate; }
                });
                if (victim !== null) impactOn(current, victim, centre);
                else crashLanding(current, centre);
            }

            stepPhase(action);
        }
    });


    // 反噬：被劈晕的目标打中非友方时，按自身攻击结算一道自伤。
    WorldCombat.on("world_combat:move_axekick/recoil", "world_combat:damage_applied", "", function (event) {
        const world = event.world(), actor = event.actor(), victim = event.target();
        if (victim === null || String(actor.key()) === String(victim.key()) || world.friendly(victim)) return;
        const data = JSON.parse(String(event.data()));
        if (!(data.actual > 0)) return;
        if (axekickCarrier(world, actor) === null) return;
        const body = world.observe(actor);
        if (body === null) return;
        const facts = PokemonDamage.combatants.read(world, actor);
        const attack = facts.stats.atk || 0;
        const fraction = axekickRecoilFraction * Math.max(0.4, Math.min(2.5, attack / 100));
        const loss = -world.health(actor, -body.maxHealth() * fraction, "world_combat:confusion");
        if (loss <= 0) return;
        WorldFeedback.emit(world, axekickScene, 1, body.position(), { moment: "fumble", target: String(actor.ref()) }, 22);
        world.sound("minecraft:entity.player.hurt", body.position(), 14, "{}");
    });

    // 恍惚存续期：目标头顶低密度绕一圈困惑气泡，每 20 刻续期，让出本体视线。
    WorldCombat.on("world_combat:move_axekick/linger", "world_combat:mob_effect_tick", "", function (event) {
        const data = JSON.parse(String(event.data()));
        if (String(data.id) !== axekickRing) return;
        const world = event.world(), actor = event.actor();
        if (!world.valid(actor) || world.tick() % 20 !== 0) return;
        const body = world.observe(actor);
        if (body === null) return;
        WorldFeedback.keep(world, "axekick:" + String(actor.ref()), axekickScene, 1, body.position(),
            { moment: "linger", target: String(actor.ref()) }, 40);
    });
}
