/**
 * 潜灵奇袭 / phantomforce —— 世界内的动作。
 *
 * 核心念头：从原地撕开一道影子裂隙滑进灵界，短暂从世界上消失；再从目标身后的裂隙里现身，越过它的守护
 * 一刀劈下——守护在灵体穿过的那一刻碎掉。
 *
 * 三幕（提交后由本招自己驱动）：
 *   起（提交前 windup）：身周聚起收束的影，可免费打断、不花 PP。
 *   潜（execute 前半）：滑进裂隙——身上挂着真实的 `world_combat:phantomforce_veil`（共享身份
 *       world_combat:status/phantomforce）与一层只挡敌对来袭攻击的吸收守护（GuardEffects 池，身份
 *       world_combat:phantomforce）；隐身与影罩走原生效果租约，相位托管效果把影罩固定在消失点，
 *       结束或取消都只收回本次相位自有的贡献。
 *   现（execute 后半）：`kind: "aim"`——指定敌人时，目标位置在消失那一刻锁定（走远就扑空），
 *       在它身后一处有支撑、放得下身体的落点现身；现身这一刀是一段真实短程，先把第一个合法敌体的守护
 *       震碎（最多 wardBreak 层），再于真实接触位置结算接触伤害。自由点瞄准同样先短闪一段、再从真实
 *       现身处沿同一条短程斩击，途中第一个敌人照样挨这一刀；那个方向什么都没有时才空闪、不结算。
 *
 * 与同族分开：挖洞是锁点破土的范围掀飞，潜灵奇袭是贴着敌人、穿过守护的单体劈击；与暗影球/暗影之骨这类
 * 直接打的幽灵招也不同，它是「先消失、再从守护里穿出来」的两拍。
 *
 * 对宝可梦、原版生物、其他模组生物和玩家，伤害（hurt → PokemonDamage）、位移（world.displace）与
 * 守护（GuardEffects → world_combat:damage_incoming）都走同一条路。
 */
namespace PokemonSkills {
    /** 消失期间的影罩：只挡敌对来源，自身来源（灼伤、坠落）不消耗它。 */
    GuardEffects.register(phantomforceRule, {
        accepts: function (effect, state, incoming) {
            const world = effect.world();
            return !!incoming.source && String(incoming.source.ref()) !== String(effect.target().ref()) && !world.friendly(incoming.source);
        },
        guarded: function (effect, state, amount, incoming) {
            const world = effect.world(), body = world.observe(effect.target());
            if (body === null) return;
            const source = incoming.source && world.observe(incoming.source);
            WorldFeedback.emit(world, phantomforceScene, 1, body.position(),
                { moment: "phase", target: String(effect.target().ref()),
                    from: source === null ? "" : String(incoming.source!.ref()) }, 20);
            world.sound("minecraft:entity.vex.hurt", body.position(), 14, "{}");
        }
    });

    /** 相位托管的影罩表现：固定停在消失点，随这条 action 拥有的效果一起收，不跟着身体移动而暴露位置。 */
    WorldCombat.effect(phantomforcePhase, 1, 1200, "action", function (json) { return json; }, EffectProtocols.unchanged);
    WorldCombat.effectHandler(phantomforcePhase, "start", function (effect) {
        const world = effect.world(), data = JSON.parse(effect.state());
        if (data.home) WorldFeedback.onEffect(world, effect.id(), "phantomforce:veil", phantomforceScene, 1,
            WorldCombat.point(data.home[0], data.home[1], data.home[2]), { moment: "veil", target: String(data.target) });
    });
    /** action 拥有的资源在动作结束/取消时自动释放，这里只收回本次相位自有的贡献；他源刷新过的效果不再匹配、不会误删。 */
    WorldCombat.effectHandler(phantomforcePhase, "end", function (effect) {
        const data = JSON.parse(effect.state());
        phantomforceWithdraw(effect.world(), effect.target(), typeof data.guard === "number" ? data.guard : 0,
            data.veil || null, data.invis || null);
    });

    /** 只收回本次相位自有的守护与影罩：先按锚点确认还是自己那一层，再移除。 */
    function phantomforceWithdraw(world: CombatWorld, actor: CombatActor, guard: number, veil: MobEffects.Anchor | null, invis: MobEffects.Anchor | null): void {
        if (guard > 0) world.operation(guard, "world_combat:dispel", "{}");
        if (!world.valid(actor)) return;
        if (veil && MobEffects.matches(world, actor, veil)) MobEffects.consume(world, actor, phantomforceVeil);
        if (invis && MobEffects.matches(world, actor, invis)) MobEffects.consume(world, actor, "minecraft:invisibility");
    }

    /** 有支撑的落点：freeSpace 只保证放得下身体，这里再用原生碰撞顶面确认脚下真有可站的脚地（草/花不算）。 */
    function phantomforceSupported(world: CombatWorld, spot: CombatPoint): CombatPoint | null {
        return SurfacePaths.support(world, spot, 0.5, 2);
    }
    function phantomforceSpot(world: CombatWorld, centre: CombatPoint, width: number, height: number): CombatPoint | null {
        if (!LivingActions.hasFreeSpace(world)) return null;
        const offsets = [[0, 0, 0], [1, 0, 0], [-1, 0, 0], [0, 0, 1], [0, 0, -1], [1, 0, 1], [-1, 0, 1], [1, 0, -1], [-1, 0, -1],
            [2, 0, 0], [-2, 0, 0], [0, 0, 2], [0, 0, -2]];
        for (let i = 0; i < offsets.length; i++) {
            const candidate = centre.plus(WorldCombat.point(offsets[i][0], offsets[i][1], offsets[i][2]));
            const supported = phantomforceSupported(world, candidate);
            if (supported && LivingActions.freeSpace(world, supported, width, height)) return supported;
        }
        return null;
    }

    define({
        freeMovement: true,
        id: phantomforceId,
        cooldownParameter: "recharge", name: "潜灵奇袭",
        description: "撕开一道影子裂隙滑进灵界、短暂隐去身形，再从目标身后的可站立位置现身劈下：现身那一刻把目标身上的守护震碎，再劈出这一记接触伤害——落点被挡住、或目标不在实际接触范围内就只挥空。自由点瞄准时朝那个方向短闪一段，再从真实现身处沿同一条短程斩击：第一个挡在中间的敌人照样被这一刀劈中并震碎守护，那个方向什么都没有时才空闪收势。隐身期间只有一层只挡敌对来袭攻击的影罩。",
        uses: ["穿过守住／看破／广域防守／硬化这类守护", "消失一拍躲开点名，再贴身反击", "从防守者身后开刀", "朝一个点短闪突进，途中第一个敌人照样挨这一刀"],
        kind: "aim", range: 7, maxRange: 9, prepare: 8, active: 1, recover: 8, cooldown: 34,
        style: "ghost", stationary: true, maximumTicks: 200,
        defaults: { deep: false, ai: { maxChase: 12, breakGuard: true, leaveStation: false } },
        fields: [field(pathOf("deep"), "深潜式", "boolean", {
            help: "开启（深潜式）：在裂隙里多停近七成时间，多震碎一层守护，但现身威力 ×0.85、起手与冷却更长——更安全，也更给对手走位的时间；关闭（掠影式）：出入更快、这一刀更重，但消失的窗口更短。"
        })],
        indicator: function (config) {
            return { radius: 0.9, geometry: "line", style: "ghost", color: 0x6B4FA8,
                label: config && config.deep === true ? "潜灵奇袭 · 深潜" : "潜灵奇袭 · 掠影" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills[phantomforceId], detail: { values: config }, world: world || null, actor: actor || null, attributes };
            return {
                prepare: Math.round(p(phantomforceId, "tempo", context)),
                recover: Math.round(p(phantomforceId, "settle", context)),
                cooldown: Math.round(p(phantomforceId, "recharge", context)),
                active: 1,
                range: skills[phantomforceId].range
            };
        },
        windup: function (action, config, prepare) {
            const body = action.sense().observe(action.actor());
            const rift = Math.max(1.2, Math.round(((body ? body.height() : 1.4) + 0.4) * 100) / 100);
            action.present("phantomforce-fade", phantomforceScene, 1, body ? body.position() : action.origin(),
                JSON.stringify({ moment: "fade", deep: config && config.deep === true ? 1 : 0, source: String(action.actor().ref()), rift: rift }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const world = action.world(), actor = action.actor(), body = world.observe(actor);
            if (body === null) { done(action); return; }
            const target = action.target();
            const aimPoint = action.targetPosition();
            const vanishTicks = Math.max(4, Math.round(p(phantomforceId, "vanishTicks", action)));
            const window = vanishTicks + 24;
            const radius = p(phantomforceId, "strikeRadius", action);
            const power = p(phantomforceId, "rift", action);
            const behind = p(phantomforceId, "behindOffset", action);
            const blink = p(phantomforceId, "blink", action);
            const budget = Math.max(1, Math.round(p(phantomforceId, "wardBreak", action)));
            const scale = radius / phantomforceReferenceRadius;
            const home = body.position();
            const rift = Math.max(1.2, Math.round((body.height() + 0.4) * 100) / 100);
            // 指定实体时，消失开始就锁定它的位置：走开超过允许范围就只挥空，不追着传送到新位置。
            const lockedBody = target !== null ? world.observe(target) : null;
            const lock = lockedBody !== null ? lockedBody.position() : aimPoint;
            let finished = false, guardEffect = 0;
            const veilEffect = MobEffects.apply(world, actor, phantomforceVeil, window, 0);
            const invisEffect = MobEffects.apply(world, actor, "minecraft:invisibility", vanishTicks + 10, 0);
            const veilAnchor = veilEffect === null ? null : MobEffects.anchor(veilEffect);
            const invisAnchor = invisEffect === null ? null : MobEffects.anchor(invisEffect);

            function finish(current: CombatAction): void {
                if (finished) return;
                finished = true;
                // 相位资源由 action 拥有、结束/取消自动释放；这里立即收回自有守护与影罩，避免收招期仍在挡刀。
                phantomforceWithdraw(current.world(), actor, guardEffect, veilAnchor, invisAnchor);
                done(current);
            }
            /** 现身失败、打空或只是空闪：不破守护、不结算伤害。 */
            function airSlash(current: CombatAction, at: CombatPoint, reason: string): void {
                const live = current.world();
                WorldFeedback.emit(live, phantomforceScene, 1, at,
                    { moment: reason === "no-target" ? "air" : "whiff",
                        target: target === null ? "" : String(target.ref()), scale: scale, reason: reason }, 30);
                WorldFeedback.text(live, at.plus(WorldCombat.point(0, 1.1, 0)), phantomforceWhiffText, [], 24);
                live.sound("minecraft:entity.enderman.teleport", at, 14, "{}");
                finish(current);
            }
            function strike(current: CombatAction): void {
                const live = current.world(), self = live.observe(actor);
                if (self === null) { finish(current); return; }
                const victimBody = target !== null && live.valid(target) ? live.observe(target) : null;
                const selfFeet = self.position().minus(WorldCombat.point(0, self.height() * 0.5, 0));
                let desired: CombatPoint, slamAt: CombatPoint;
                if (target !== null) {
                    if (victimBody === null) { airSlash(current, lock, "no-target"); return; }
                    // 目标必须还留在消失时锁定的位置附近；走远就扑空，不跟着新位置换位。
                    const now = victimBody.position();
                    if (now.minus(lock).length() > radius + behind + 0.75) { airSlash(current, lock, "no-target"); return; }
                    slamAt = now;
                    const flat = WorldCombat.point(now.x() - self.position().x(), 0, now.z() - self.position().z());
                    const heading = flat.length() < 0.01 ? WorldGeometry.flatUnit(current.direction()) : flat.unit();
                    desired = now.minus(WorldCombat.point(0, victimBody.height() * 0.5, 0))
                        .plus(WorldCombat.point(heading.x() * behind, 0, heading.z() * behind));
                } else {
                    // 自由点瞄准：朝点短闪一段，再从真实现身处沿同一条短程 trace；第一合法敌体就是可打对象，打不到才是空闪。
                    slamAt = aimPoint;
                    const flat = WorldCombat.point(aimPoint.x() - self.position().x(), 0, aimPoint.z() - self.position().z());
                    const heading = flat.length() < 0.01 ? WorldGeometry.flatUnit(current.direction()) : flat.unit();
                    const lead = Math.min(Math.max(0, flat.length()), blink);
                    desired = selfFeet.plus(WorldCombat.point(heading.x() * lead, 0, heading.z() * lead));
                }
                // 现身只能落在放得下身体、且脚下有真实碰撞支撑的位置；悬崖边或放不下就留在原处挥空。
                const spot = phantomforceSpot(live, desired, self.width(), self.height());
                if (spot === null) { airSlash(current, victimBody !== null ? victimBody.position() : desired, "no-room"); return; }
                if (!live.teleport(actor, spot)) { airSlash(current, home, "blocked"); return; }
                const moved = live.observe(actor);
                const landing = moved === null ? spot : moved.position();
                // 现身这一刀是一段真实短程：从真实现身处 trace 到接触点，只结算第一个合法敌体；隔墙或先碰到别人都算挥空。
                const slam = current.trace(landing, slamAt, radius, false);
                const first = slam.hitEntity() ? slam.target() : null;
                let victim: CombatActor | null = null;
                if (first !== null && String(first.ref()) !== String(actor.ref()) && !live.friendly(first)
                    && (target === null || String(first.ref()) === String(target.ref()))) victim = first;
                if (victim === null) { airSlash(current, slam.position(), slam.blocked() ? "no-contact" : "no-target"); return; }
                const contact = slam.position();
                let broken = 0;
                const guards = GuardEffects.barriers(live, victim);
                for (let index = 0; index < guards.length && broken < budget; index++) {
                    if (live.operation(guards[index].id(), "world_combat:dispel", "{}")) broken++;
                }
                if (broken > 0) {
                    WorldFeedback.emit(live, phantomforceScene, 1, contact, { moment: "shatter", target: String(victim.ref()),
                        scale: scale, broken: broken, wards: Math.max(4, broken * 6) }, 28);
                    WorldFeedback.text(live, contact.plus(WorldCombat.point(0, 1.2, 0)), phantomforcePierceText, [broken], 34);
                    live.sound("minecraft:block.glass.break", contact, 14, "{}");
                }
                const landed = hurt(current, victim, phantomforceId, power, { damage: damageSpec(phantomforceId, "rift"), contact: true });
                WorldFeedback.emit(live, phantomforceScene, 1, contact, { moment: landed ? "strike" : "whiff",
                    target: String(victim.ref()), scale: scale, broken: broken,
                    intensity: 1 + Math.min(1.2, broken * 0.35) }, 34);
                if (landed && broken === 0) WorldFeedback.text(live, contact.plus(WorldCombat.point(0, 1.15, 0)), phantomforceStrikeText, [], 28);
                else if (!landed && broken === 0) WorldFeedback.text(live, contact.plus(WorldCombat.point(0, 1.1, 0)), phantomforceWhiffText, [], 26);
                live.sound(landed ? "cobblemon:impact.ghost" : "minecraft:entity.enderman.teleport", contact, 16, "{}");
                finish(current);
            }

            sound(action, "minecraft:entity.enderman.teleport");
            WorldFeedback.emit(world, phantomforceScene, 1, home, { moment: "fade", vanish: vanishTicks, scale: scale, rift: rift }, 30);
            guardEffect = GuardEffects.apply(world, actor, { rule: phantomforceRule, mode: "pool", capacity: 1000000000, fraction: 1,
                minimumHealth: 0, charges: 0, linkRange: 0 }, window);
            // 相位效果由本 action 拥有：动作结束或取消时自动释放，end 处理器只收回本次自有的守护/影罩。
            action.effect(phantomforcePhase, actor, JSON.stringify({ home: [home.x(), home.y(), home.z()],
                target: String(actor.ref()), guard: guardEffect, veil: veilAnchor, invis: invisAnchor }), window);
            action.after(vanishTicks, function (next) { strike(next); });
        }
    });
}
