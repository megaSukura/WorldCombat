/**
 * 火焰鞭 / firelash 的出手方式。本族「拆甲换力」的剥甲型——唯一让对手付防御代价的一招。
 *
 * 核心念头：**一条渐次亮起的火鞭**——先在手边点起火苗，再把鞭沿自由瞄准锁定的方向分四拍从短甩到长、
 *   再落下；整条鞭的逐段伸展就是判定路径，真实扫到第一个敌人或墙就终止。命中必然把目标的护甲烧软（防御 −1）。
 *
 * 三幕（提交前只播预告）：
 *   起（kindle）：手边/尾端点起火苗、鞭身越拉越长、越亮，只播预告，此时代价未结清。
 *   抽（lash → hit / miss / wall）：提交后以固定释放方向把鞭分 4 刻从短向长甩出再落下，沿原 `firelashArc`
 *       形状逐段 `action.trace`；首个接触的敌人结算一次 `lash` 接触伤害（最多一次主伤），墙则拦腰散火。
 *       仅实际伤害成功才把目标防御降 `melt` 级；缠卷式（配置 entangle）在真实命中者上把火绳分 4 刻收回，
 *       按原 `drag` 总预算拉向释放者并给 `slowTicks`，墙或目标失效立即断。
 *   收（bank）：火鞭收回、余火散去；命中浮字写明剥掉了几级防御。
 *
 * 与同族分开：蛮力/鳞射/鳞片噪音都是自己付防御，火焰鞭剥对手的甲；与强力鞭打分开——
 *   强力鞭打是草色、一道远而宽的横扫弧面；火焰鞭是火色、单目标的一条长鞭，鞭梢缠住落点把甲烧软。
 *
 * 配置 `entangle` 由公式改威力／射程／剥甲级，由本文件改拖拽与减速；提交后才触碰世界。
 * 选取 `kind:"aim"`：可自由上下瞄准、可空甩，实际鞭路径首碰为准；攻击许可仍由命中层裁定。
 */
namespace PokemonSkills {
    const firelashScene = "world_combat:move_firelash";
    const firelashMeltText = "world_combat.move.firelash.text.melt";
    const firelashBindText = "world_combat.move.firelash.text.bind";
    const firelashMissText = "world_combat.move.firelash.text.miss";
    const firelashBeats = 4;

    /** 原 firelashArc 形状：从起点到终点的上扬弧线在参数 u（0..1）上的取样；判定与表现共用同一公式。 */
    function firelashArcPoint(from: CombatPoint, to: CombatPoint, u: number): CombatPoint {
        return WorldCombat.point(
            from.x() + (to.x() - from.x()) * u,
            from.y() + (to.y() - from.y()) * u + Math.sin(u * Math.PI) * 0.45,
            from.z() + (to.z() - from.z()) * u);
    }

    define({
        id: "firelash",
        cooldownParameter: "recharge",
        name: "Fire Lash",
        description: "点起一条燃烧的长鞭，沿瞄准方向分四拍甩出再落下：整条鞭扫过的路径就是判定线，真实扫到第一个敌人或墙就停。命中造成单体物理火焰伤害并必然把目标防御烧降 1 级；缠卷式把实际命中的目标分四拍拉向自己并短暂减速、剥甲两级，代价是威力、鞭长与出手速度。",
        uses: ["中距离用一条火鞭剥掉对手防御，给后续攻击开路", "缠卷式把目标拖到身边再接一记近战", "对高防目标持续削甲"],
        kind: "aim",
        range: 4.2,
        maxRange: 6.4,
        prepare: 11,
        active: 0,
        recover: 9,
        cooldown: 34,
        maximumTicks: 200,
        style: "lash",
        defaults: { entangle: false, ai: { maxChase: 8, strip: true, finish: false } },
        fields: [],
        indicator: function (config, pokemon) {
            return { radius: pokemon ? p("firelash", "reach", pokemon) : 4.2, geometry: "line", style: "lash",
                color: 0xE87722, label: config && config.entangle === true ? "火焰鞭·缠卷式" : "火焰鞭·鞭挞式" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills["firelash"], detail: { values: config },
                world: world || null, actor: actor || null, attributes };
            return {
                prepare: Math.round(p("firelash", "tempo", context)),
                recover: Math.round(p("firelash", "aftercast", context)),
                cooldown: Math.round(p("firelash", "recharge", context)),
                active: 0,
                range: p("firelash", "reach", context)
            };
        },
        windup: function (action, config, prepare) {
            action.present("world_combat:move_firelash:kindle", firelashScene, 1, action.origin(),
                JSON.stringify({ moment: "kindle", entangle: config && config.entangle === true ? 1 : 0,
                    reach: Math.round(p("firelash", "reach", action) * 10) / 10 }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const world = action.world();
            const actor = action.actor();
            const origin = action.origin();
            const raw = aim(action);
            const direction = raw.length() < 1e-6 ? action.direction() : raw.unit();
            const reach = Math.max(2.4, p("firelash", "reach", action));
            const power = p("firelash", "lash", action);
            const melt = Math.max(1, Math.round(p("firelash", "melt", action)));
            const slowTicks = Math.max(0, Math.round(p("firelash", "slowTicks", action)));
            const entangle = !!(config && config.entangle);
            const tip = origin.plus(direction.scale(reach));
            const whipWidth = Math.max(0.22, Math.min(0.5, reach * 0.07));
            const scale = reach / 4.2;
            const intensity = Math.max(0.5, Math.min(2.2, power / 80));
            const embers = Math.round(12 + power * 0.3);
            const scenes = WorldFeedback.actionScenes(firelashScene);
            let settled = false;

            function finish(current: CombatAction): void { if (settled) return; settled = true; scenes.finish(current, done); }

            /** 鞭身取样到参数 u 的有序顶点：判定与画面读同一组顶点。 */
            function whipPath(u: number): number[][] {
                const path: number[][] = [];
                for (let i = 0; i <= 8; i++) {
                    const point = firelashArcPoint(origin, tip, u * i / 8);
                    path.push([point.x(), point.y(), point.z()]);
                }
                return path;
            }

            /** 逐段伸展：每拍只 trace 新伸出的那一段，首个敌人/墙终止；不是最后一拍就排下一拍。 */
            function unfurl(current: CombatAction, beat: number): void {
                if (settled) return;
                const scope = current.world();
                const from = firelashArcPoint(origin, tip, beat / firelashBeats);
                const to = firelashArcPoint(origin, tip, (beat + 1) / firelashBeats);
                const contact = current.trace(from, to, whipWidth);
                const path = whipPath((beat + 1) / firelashBeats);
                scenes.show(current, "whip", to,
                    { moment: "lash", path: path, tip: [to.x(), to.y(), to.z()], embers: embers, intensity: intensity, scale: scale });

                if (contact.hitEntity()) {
                    const victim = contact.target();
                    if (victim !== null && scope.valid(victim) && !scope.friendly(victim)) { connect(current, contact, victim); return; }
                    // 友方/自己先挡住鞭梢：停在身体上，不结算敌方伤害。
                    scenes.stop(current, "whip");
                    WorldFeedback.emit(scope, firelashScene, 1, contact.position(), { moment: "miss", scale: scale }, 16);
                    sound(current, "minecraft:entity.player.attack.weak");
                    finish(current);
                    return;
                }
                if (contact.blocked()) {
                    const at = contact.blockPosition();
                    scenes.stop(current, "whip");
                    WorldFeedback.emit(scope, firelashScene, 1, at === null ? contact.position() : at,
                        { moment: "miss", face: contact.blockFace(), scale: scale }, 18);
                    WorldFeedback.text(scope, (at === null ? contact.position() : at).plus(WorldCombat.point(0, 1.0, 0)), firelashMissText, [], 22);
                    sound(current, "minecraft:entity.player.attack.weak");
                    finish(current);
                    return;
                }
                if (beat + 1 < firelashBeats) { current.after(1, function (next: CombatAction) { unfurl(next, beat + 1); }); return; }
                // 四拍走完仍没碰到：鞭梢落空。
                scenes.stop(current, "whip");
                WorldFeedback.emit(scope, firelashScene, 1, to, { moment: "miss", tip: [to.x(), to.y(), to.z()], scale: scale }, 18);
                WorldFeedback.text(scope, to.plus(WorldCombat.point(0, 1.0, 0)), firelashMissText, [], 22);
                sound(current, "minecraft:entity.player.attack.weak");
                finish(current);
            }

            /** 真实扫中敌人：只在这一刻结算一次主伤；成功才剥甲，缠卷式才把火绳收回拽人。 */
            function connect(current: CombatAction, contact: CombatImpact, victim: CombatActor): void {
                const scope = current.world();
                const at = contact.position();
                const victimRef = String(victim.ref());
                const landed = impact(current, contact, "firelash", power,
                    { damage: damageSpec("firelash", "lash"), contact: true });
                scenes.stop(current, "whip");
                if (!landed) {
                    WorldFeedback.emit(scope, firelashScene, 1, at, { moment: "miss", target: victimRef, scale: scale }, 16);
                    sound(current, "minecraft:entity.player.attack.weak");
                    finish(current);
                    return;
                }
                NativeEffects.boost(scope, victim, "def", -melt);
                WorldFeedback.emit(scope, firelashScene, 1, at,
                    { moment: "hit", target: victimRef, embers: embers, intensity: intensity, scale: scale, melt: melt }, 20);
                WorldFeedback.text(scope, at.plus(WorldCombat.point(0, 1.2, 0)), firelashMeltText, [melt], 30);
                sound(current, "cobblemon:impact.fire");

                if (!entangle || !scope.valid(victim)) { finish(current); return; }
                const drag = Math.max(0, p("firelash", "drag", withTarget(factContext(current), victim)));
                if (slowTicks > 0) scope.marker(victim, "minecraft:slowness", slowTicks, 1);
                if (drag <= 0.05) { finish(current); return; }
                scenes.show(current, "rope", at, { moment: "bind", path: ["source", victimRef], target: victimRef,
                    drag: drag, slowTicks: slowTicks, embers: Math.round(embers * 0.7), intensity: intensity, scale: scale });
                pull(current, victimRef, drag, drag / firelashBeats, 0);
            }

            /** 缠卷回收：分四拍把实际命中者按 drag 总预算拉向释放者；墙或目标失效立即断。 */
            function pull(current: CombatAction, victimRef: string, remaining: number, perBeat: number, elapsed: number): void {
                if (settled) return;
                const scope = current.world();
                const body = scope.observe(actor);
                const victim = scope.actor(victimRef);
                const held = victim !== null && scope.valid(victim) ? scope.observe(victim) : null;
                if (body === null || held === null) { snap(current, victimRef, false); return; }
                if (remaining <= 0.05 || elapsed >= firelashBeats) { snap(current, victimRef, true); return; }
                const toward = body.position().minus(held.position());
                if (!scope.clear(held.position(), body.position())) { snap(current, victimRef, false); return; }
                const step = Math.min(remaining, perBeat);
                const moved = toward.length() < 0.05 ? 0 : scope.displace(victim!, toward.unit().scale(step));
                const left = Math.max(0, remaining - moved);
                scenes.show(current, "rope", held.position(),
                    { moment: "bind", path: ["source", victimRef], target: victimRef, remaining: left,
                        embers: Math.round(embers * 0.6), intensity: intensity, scale: scale });
                if (moved <= 0.001) { snap(current, victimRef, false); return; }
                current.after(1, function (next: CombatAction) { pull(next, victimRef, left, perBeat, elapsed + 1); });
            }

            /** 火绳收尾：成功收拢就浮字，目标失效或墙断就只收表现。 */
            function snap(current: CombatAction, victimRef: string, held: boolean): void {
                const scope = current.world();
                scenes.stop(current, "rope");
                const victim = scope.actor(victimRef);
                const body = victim !== null && scope.valid(victim) ? scope.observe(victim) : null;
                const at = body !== null ? body.position() : current.origin();
                WorldFeedback.emit(scope, firelashScene, 1, at,
                    { moment: "bind", target: victimRef, held: held ? 1 : 0, embers: Math.round(embers * 0.5), intensity: intensity, scale: scale }, 22);
                if (held) WorldFeedback.text(scope, at.plus(WorldCombat.point(0, 1.3, 0)), firelashBindText, [], 26);
                finish(current);
            }

            sound(action, "cobblemon:move.firepunch.actor");
            WorldFeedback.emit(world, firelashScene, 1, origin,
                { moment: "kindle", embers: embers, intensity: intensity, scale: scale, entangle: entangle ? 1 : 0 }, 14);
            unfurl(action, 0);
        }
    });
}
