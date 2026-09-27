/**
 * 吸取之吻 / drainingkiss 的出手方式。
 *
 * 核心念头：把脸凑到对手身上贴住一小会儿，再把它的一口气吸过来——它比同族任何一口都黏，抽回的比例超过一半以上。
 *
 * 两幕：
 *   起（windup，提交前）：唇边亮起粉光、几颗心向内收拢，只播预告。
 *   吻（kiss / slip / miss，提交后）：先沿真实朝向短 trace 找到**第一个身体**并锁住它；随后每刻重读两体最近面，
 *       把住真实接触点。贴住 `dwell` 刻（沉醉 6 刻）后一次性结算 `peck` 接触伤害，伤害的 3/4 经共享 `drain`
 *       转回自身。贴触期间只允许自己最多短探 `probe` 格去维持；对方挣脱（间距超过 `contactGap`）、中间被墙隔开
 *       或动作被打断就松口，不吸附、不拖动目标，也不留遥控光绳。
 *
 * 与家族分开：食梦必须先睡着、吸取是藤不脱手、花粉团按对象分红伤；只有它是**贴住一会儿再一口**的回吻，
 *   汲取比例最高、回血最黏。
 *
 * 命中、防御、相性与暴击走共享 `hurt`；回复走共享伤害载荷的 `drain`，对所有战斗者同一条路。
 * 自由 aim：可指敌、可只朝一个方向或世界点空放；空放、首碰为墙或友体时只散一点心。
 */
namespace PokemonSkills {
    const drainingkissKissText = "world_combat.move.drainingkiss.text.kiss";
    const drainingkissMendText = "world_combat.move.drainingkiss.text.mend";
    const drainingkissMissText = "world_combat.move.drainingkiss.text.miss";
    const drainingkissSlipText = "world_combat.move.drainingkiss.text.slip";

    function drainingkissAbove(point: CombatPoint): CombatPoint { return point.plus(WorldCombat.point(0, 1.05, 0)); }

    define({
        id: drainingkissId,
        cooldownParameter: "recharge",
        name: "Draining Kiss",
        description: "凑到对手脸上贴住一小会儿，再把它的一口气吸过来；按实际造成的伤害回补自身，是家族里回血最黏的一口。对方挣脱、被墙隔开或动作被打断就亲空。",
        uses: ["贴身把对手的一口气吸回来", "血量偏低时用一次短吻续航", "在缠斗里把血线拉回来"],
        kind: "aim",
        range: 1.0,
        maxRange: 2.0,
        prepare: 2,
        active: 1,
        recover: 8,
        cooldown: 26,
        style: "kiss",
        defaults: { swoon: false, ai: { maxChase: 8, healBelow: 0.85 } },
        fields: [],
        indicator: function (config, pokemon) {
            const context: any = { pokemon: pokemon, skill: skills[drainingkissId], detail: { values: config } };
            const radius = pokemon ? Math.max(0.6, p(drainingkissId, "reach", context) + p(drainingkissId, "radius", context)) : 0.9;
            return { radius: radius, geometry: "circle", style: "kiss", color: 0xFF8FB8,
                label: config && config.swoon === true ? "吸取之吻·沉醉" : "吸取之吻" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills[drainingkissId], detail: { values: config }, world: world || null, actor: actor || null, attributes };
            const dwell = Math.round(p(drainingkissId, "dwell", context));
            // 把原起手相应的一段移进接触窗：贴上去的时间短，剩余留到提交后保持。
            return {
                prepare: Math.max(1, Math.round(p(drainingkissId, "tempo", context)) - dwell),
                recover: Math.round(p(drainingkissId, "aftercast", context)),
                cooldown: Math.round(p(drainingkissId, "recharge", context)),
                active: 1,
                range: p(drainingkissId, "reach", context) + 0.3
            };
        },
        windup: function (action, config, prepare) {
            action.present("world_combat:drainingkiss:" + action.id(), drainingkissScene, 1, action.origin(),
                JSON.stringify({ moment: "lean", target: action.target() === null ? "" : String(action.target()!.ref()),
                    swoon: config && config.swoon === true }));
            return prepare;
        },
        // 提交前只读复核：目标在视线里且两张脸已经挨到可以贴上；自由 aim 的空放照常提交。
        ready: function (action, config) {
            const target = action.target(), world = action.sense();
            if (target === null) return "";
            if (!world.valid(target) || world.friendly(target)) return "invalid-target";
            const self = world.observe(action.actor()), body = world.observe(target);
            if (self === null || body === null) return "target-left";
            const reachGap = Math.max(0, p(drainingkissId, "contactGap", action)) + Math.max(0, p(drainingkissId, "probe", action));
            const near = world.closestPoint(action.actor(), body.position());
            const far = world.closestPoint(target, self.position());
            return near.minus(far).length() > reachGap ? "out-of-contact" : "";
        },
        execute: function (action, move, config, done) {
            const world = action.world();
            const power = p(drainingkissId, "peck", action);
            const share = p(drainingkissId, "sap", action);
            const radius = Math.max(0.2, p(drainingkissId, "radius", action));
            const contactGap = Math.max(0, p(drainingkissId, "contactGap", action));
            const holdGap = contactGap;
            const probeBudget = Math.max(0, p(drainingkissId, "probe", action));
            const dwell = Math.max(1, Math.round(p(drainingkissId, "dwell", action)));
            const hearts = Math.max(6, Math.round(p(drainingkissId, "hearts", action)));
            const scale = Math.max(0.6, Math.min(1.8, radius / 0.42));
            const intensity = Math.max(0.6, Math.min(2.2, power / 50));
            const scenes = WorldFeedback.actionScenes(drainingkissEmbraceScene);
            const self = world.observe(action.actor());
            const from = self === null ? action.origin() : self.position();
            const direction = aim(action);
            let settled = false, probeLeft = probeBudget;

            function finish(current: CombatAction): void { if (settled) return; settled = true; scenes.stop(current); done(current); }

            /** 亲空：墙先挡、首碰是友体、或没碰到任何身体，都只散开一点心，不回补。 */
            function whiff(current: CombatAction, at: CombatPoint): void {
                const scope = current.world();
                WorldFeedback.emit(scope, drainingkissScene, 1, at, { moment: "miss", scale: scale }, 18);
                WorldFeedback.text(scope, drainingkissAbove(at), drainingkissMissText, [], 22);
                sound(current, "minecraft:entity.allay.item_taken");
                finish(current);
            }

            /** 松口：贴触中途目标脱开、被墙隔开或失效；不结算伤害也不回补。 */
            function slip(current: CombatAction, at: CombatPoint): void {
                const scope = current.world();
                WorldFeedback.emit(scope, drainingkissScene, 1, at, { moment: "slip", scale: scale }, 20);
                WorldFeedback.text(scope, drainingkissAbove(at), drainingkissSlipText, [], 22);
                sound(current, "minecraft:entity.player.attack.weak");
                finish(current);
            }

            /** 贴满 `dwell` 刻后的一口：只有伤害真的被接受才报成功与回血。 */
            function settle(current: CombatAction, foe: CombatActor, at: CombatPoint): void {
                const scope = current.world(), me = scope.observe(current.actor());
                const before = me === null ? 0 : me.health();
                const landed = hurt(current, foe, drainingkissId, power,
                    { damage: damageSpec(drainingkissId, "peck"), contact: true, drain: share });
                const after = scope.observe(current.actor());
                const healed = landed && after !== null ? Math.max(0, after.health() - before) : 0;
                const selfPoint = after === null ? at : after.position();
                const flow = selfPoint.minus(at), span = flow.length();
                const inward = span < 0.05 ? WorldCombat.point(0, 1, 0) : flow.unit();
                WorldFeedback.emit(scope, drainingkissScene, 1, at,
                    { moment: "kiss", target: String(foe.ref()), span: span, hearts: hearts, scale: scale,
                        direction: [inward.x(), inward.y(), inward.z()], intensity: intensity }, 30);
                sound(current, "cobblemon:impact.fairy");
                if (landed) {
                    WorldFeedback.text(scope, drainingkissAbove(at), drainingkissKissText, [], 22);
                    if (healed > 0) {
                        WorldFeedback.emit(scope, drainingkissScene, 1, selfPoint, { moment: "mend", heal: healed, hearts: hearts }, 26);
                        WorldFeedback.text(scope, drainingkissAbove(selfPoint), drainingkissMendText, [Math.round(healed * 10) / 10], 22);
                    }
                }
                finish(current);
            }

            /** 贴住后逐刻重验：两体最近面、中间有没有墙；允许自己短探一点，但绝不拖动目标。 */
            function hold(current: CombatAction, foe: CombatActor, tick: number): void {
                const scope = current.world();
                if (!scope.valid(foe) || scope.friendly(foe)) { slip(current, current.targetPosition()); return; }
                const me = scope.observe(current.actor()), body = scope.observe(foe);
                if (me === null || body === null) { slip(current, body === null ? current.targetPosition() : body.position()); return; }
                let near = scope.closestPoint(current.actor(), body.position());
                let far = scope.closestPoint(foe, me.position());
                let gap = near.minus(far).length();
                if (gap > holdGap && probeLeft > 0.001) {
                    const seek = far.minus(near);
                    if (seek.length() > 0.001) {
                        const step = Math.min(probeLeft, gap - holdGap + 0.02);
                        const applied = scope.displace(current.actor(), seek.unit().scale(step));
                        if (applied > 0) probeLeft -= applied;
                        const moved = scope.observe(current.actor()), stayed = scope.observe(foe);
                        if (moved !== null && stayed !== null) {
                            near = scope.closestPoint(current.actor(), stayed.position());
                            far = scope.closestPoint(foe, moved.position());
                            gap = near.minus(far).length();
                        }
                    }
                }
                // 墙隔开就够不着；间距超过容差就是挣脱。
                if (gap > holdGap || WorldGeometry.blockHit(scope, near, far) !== null) { slip(current, far); return; }
                const at = near.plus(far).scale(0.5);
                scenes.show(current, "embrace", at,
                    { moment: "embrace", target: String(foe.ref()), from: [near.x(), near.y(), near.z()], to: [far.x(), far.y(), far.z()],
                        progress: dwell <= 1 ? 1 : Math.min(1, tick / dwell), hearts: hearts, scale: scale, intensity: intensity });
                if (tick >= dwell) { settle(current, foe, at); return; }
                current.after(1, function (next: CombatAction) { hold(next, foe, tick + 1); });
            }

            // 自由瞄准：沿朝向做一段短 trace；最先碰到的人才是这一吻贴到的人，墙与身体首碰都会停下。
            const hit = action.trace(from, from.plus(direction.scale(action.range())), radius, true);
            const foe = hit.hitEntity() ? hit.target() : null;
            if (foe === null || !world.valid(foe) || world.friendly(foe)) {
                whiff(action, hit.hitEntity() || hit.blocked() ? hit.position() : from.plus(direction.scale(action.range())));
                return;
            }
            sound(action, "minecraft:entity.allay.item_given");
            hold(action, foe, 0);
        }
    });
}
