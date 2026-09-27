/**
 * 叶刃 / leafblade —— 注册与动作。
 *
 * 核心念头：把一片叶当作剑握在手里，站定、朝本次瞄准方向扫出一记**又快又横斜的叶斩**。刀锋由身体左前低侧
 *   划过正前、再到右前高侧，只结算这一笔真正扫到的**第一个身体**：碰到非友方就切中一次，碰到自己人只被
 *   挡住，碰到实墙就截刀。它不自动贴到目标中心、不削防、不追加旁伤——**站位本身就是这一刀的距离与方向**。
 *
 * 幕：
 *   起（windup，提交前）：叶在身侧立起、拉长成一把刃，边缘亮起；只播预告，可被打断。
 *   斩（sweep → cut / block / miss）：提交后逐刻把刀锋从 -span/2 扫到 +span/2，同时抬高；每刻读取**当前真实
 *       自身位置**，刀根/刀尖/刀高的绝对位置按当前身体重算（被击飞或落地后刀跟着走）。同一刻里把上一刻到这一
 *       刻的角度扫过**按最大间距细分为有序子段**，沿扫向逐个 trace，真正最先接触的身体即本次一刀；先求接触再
 *       用 Impact.position 裁当前刃段与短尾迹，画出来的刀不会越过墙面。非友方吃满 `edge` 接触斩击，自己被墙
 *       截住则停在墙面；本体到刀根的实墙可达也要成立。
 *   收（retract）：无论是否切中，刀尖都清楚收回；空挥在刃程末端留一记空收。高暴击沿用原生 critRatio 2，
 *       暴击时由本单元监听器**沿同一笔刀路**补一记亮白短闪，不追加十字或二段爆发。
 *
 * 选取：`kind: "aim"`——朝方向或世界点挥都成立，空挥也成立；点选实体只决定朝哪边挥，目标若不在刃程内不会隔空命中。
 *   命中权限仍由命中层判断；伤害或状态被原生拒绝时只做中性收刃，不发成功叶屑/切痕。
 */
namespace PokemonSkills {
    /** 暴击强调沿用的同一笔刀路，写在本次执行的作用域里，由要害监听器读取。 */
    const leafbladeStrokeKey = "world_combat:leafblade/stroke";

    /** 本刻刀锋的一对端点：ratio 0→1 由左前低侧扫到右前高侧；判定与表现共用这对端点。 */
    function leafbladeBlade(origin: CombatPoint, heading: CombatPoint, side: CombatPoint, ratio: number,
        inner: number, radius: number, halfSpan: number, handY: number, tipLowY: number, tipHighY: number):
        { base: CombatPoint; tip: CombatPoint } {
        const angle = -halfSpan + halfSpan * 2 * ratio, cosine = Math.cos(angle), sine = Math.sin(angle);
        const outward = WorldCombat.point(heading.x() * cosine + side.x() * sine, 0, heading.z() * cosine + side.z() * sine);
        const tipY = tipLowY + (tipHighY - tipLowY) * ratio;
        return {
            base: WorldCombat.point(origin.x() + outward.x() * inner, handY, origin.z() + outward.z() * inner),
            tip: WorldCombat.point(origin.x() + outward.x() * radius, tipY, origin.z() + outward.z() * radius)
        };
    }
    /** 一个点转成表现载荷用的 [x,y,z]。 */
    function leafbladeTriple(point: CombatPoint): number[] { return [point.x(), point.y(), point.z()]; }

    define({
        freeMovement: true,
        id: leafbladeId,
        cooldownParameter: "recharge",
        name: "Leaf Blade",
        description: "把一片叶当作剑，朝选定方向站定扫出一记近身横斜叶斩：刀锋从身体左前低侧划到右前高侧，只结算这一笔真正扫到的第一个敌人，碰到实墙就被截断。不自动贴向目标、不削防、不追加旁伤——自己选站位，让目标正好落进刃缘；容易击中要害。双手式更重更慢、单手式更快更利落。",
        uses: ["朝选定方向挥出一记贴身横斜叶斩", "只切中刀锋首个碰到的敌人，不追加旁伤", "自己选站位，让目标正好落进刃缘"],
        kind: "aim",
        range: 3.0,
        maxRange: 4.6,
        prepare: 8,
        active: 0,
        recover: 8,
        cooldown: 26,
        style: "leaf",
        defaults: { twohand: false, ai: { maxChase: 4, finishLow: true } },
        fields: [],
        indicator: function (config, pokemon) {
            return { radius: p(leafbladeId, "reach", pokemon), geometry: "cone", style: "leaf", color: 0x9BE86A,
                label: config && config.twohand === true ? "双手叶刃" : "叶刃" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon: pokemon, skill: skills[leafbladeId], detail: { values: config },
                world: world || null, actor: actor || null, attributes: attributes };
            return {
                prepare: Math.round(p(leafbladeId, "tempo", context)),
                recover: Math.round(p(leafbladeId, "aftercast", context)),
                cooldown: Math.round(p(leafbladeId, "recharge", context)),
                active: 0,
                range: p(leafbladeId, "reach", context)
            };
        },
        windup: function (action, config, prepare) {
            action.present("leafblade:draw", leafbladeScene, 1, action.origin(),
                JSON.stringify({ moment: "draw", windup: prepare, twohand: config && config.twohand === true }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const world = action.world();
            const actor = action.actor();
            const direction = aim(action);
            const power = p(leafbladeId, "edge", action);
            const reach = p(leafbladeId, "reach", action);
            const span = p(leafbladeId, "span", action);
            const shards = Math.max(8, Math.round(p(leafbladeId, "shards", action)));
            const twohand = config && config.twohand === true ? 1 : 0;
            const self = world.observe(actor);
            if (self === null) { done(action); return; }
            const heading = WorldGeometry.flatUnit(direction, WorldCombat.point(0, 0, 1));
            const side = WorldCombat.point(-heading.z(), 0, heading.x());
            const scale = Math.max(0.6, Math.min(2.0, reach / leafbladeReference));
            const intensity = Math.max(0.6, Math.min(2.4, power / 90));
            const inner = Math.max(0.35, self.width() * 0.35);
            // 刀高保存为相对本体的偏移，每刻用当前身体位置重算，被击飞/落地后刀跟着本体走。
            const handDy = Math.max(0.5, self.height() * 0.45);
            const tipLowDy = Math.max(0.45, self.height() * 0.3);
            const tipHighDy = Math.max(handDy + 0.2, self.height() * 0.85);
            const halfSpan = span * Math.PI / 360;
            // 张角越宽，步进越细，保证同一横斜弧上没有漏检；起手到收刃是一段持续过程，scene manager 独立建立。
            const steps = Math.max(5, Math.min(9, Math.round(span / 15)));
            // 相邻两刻刃姿之间按最大间距细分：尖端点间距不超过约 0.4 格，细于刃厚直径，薄体型/横穿者不会从间隙漏过。
            const tickAngle = (span * Math.PI / 180) / steps;
            const maxSubAngle = reach > 0.2 ? 2 * Math.asin(Math.min(1, 0.2 / reach)) : tickAngle;
            const subSteps = Math.max(1, Math.min(6, Math.ceil(tickAngle / Math.max(maxSubAngle, 1e-3))));
            const scenes = WorldFeedback.actionScenes(leafbladeScene);
            const trail: number[][] = [];
            let settled = false;

            function finish(current: CombatAction): void { if (!settled) { settled = true; scenes.finish(current, done); } }

            /** 本刻某一比例下的真实刃段：刀根、刀尖都用当前身体位置与相对刀高。 */
            function bladeAt(origin: CombatPoint, ratio: number): { base: CombatPoint; tip: CombatPoint } {
                return leafbladeBlade(origin, heading, side, ratio, inner, reach, halfSpan,
                    origin.y() + handDy, origin.y() + tipLowDy, origin.y() + tipHighDy);
            }
            /** 画当前这一笔真实刃段（可被接触点裁短），判定与表现共用同一组端点。 */
            function showBlade(current: CombatAction, origin: CombatPoint, base: CombatPoint, tip: CombatPoint): void {
                scenes.show(current, "blade", origin,
                    { moment: "sweep", path: [leafbladeTriple(base), leafbladeTriple(tip)],
                      shards: shards, scale: scale, intensity: intensity, twohand: twohand });
            }

            /** 首个接触非友方：只结算这一记，然后收刃。 */
            function resolve(current: CombatAction, victim: CombatActor, base: CombatPoint, contactPoint: CombatPoint): void {
                const scope = current.world();
                const body = scope.observe(victim);
                const at = body !== null ? body.position() : contactPoint;
                const stroke = [leafbladeTriple(base), leafbladeTriple(contactPoint)];
                // 存下这一笔真实刀路，供要害监听器沿同一笔增强。
                scope.originData(leafbladeStrokeKey, JSON.stringify({ path: stroke, scale: scale, intensity: intensity, shards: shards }));
                scenes.stop(current, "blade");
                const landed = hurt(current, victim, leafbladeId, power,
                    { damage: damageSpec(leafbladeId, "edge"), contact: true, slice: true });
                if (landed) {
                    WorldFeedback.emit(scope, leafbladeScene, 1, at,
                        { moment: "cut", target: String(victim.ref()), path: stroke, shards: shards, scale: scale,
                          intensity: intensity, twohand: twohand }, 22);
                    const textAt = body !== null ? body.position() : at;
                    WorldFeedback.text(scope, textAt.plus(WorldCombat.point(0, (body !== null ? body.height() : 1.2) * 0.75, 0)),
                        leafbladeCutText, [], 24);
                } else {
                    // 伤害/状态被原生拒绝：只留一记中性收刃，不发成功叶屑与切痕。
                    WorldFeedback.emit(scope, leafbladeScene, 1, at,
                        { moment: "miss", target: String(victim.ref()), shards: Math.max(6, Math.round(shards * 0.5)), scale: scale }, 18);
                    WorldFeedback.text(scope, at.plus(WorldCombat.point(0, 1.0, 0)), leafbladeMissText, [], 20);
                }
                finish(current);
            }

            /** 空挥末端清楚收回：刀尖沿最后一笔方向朝刀根缩回，只做表现、不再判定。 */
            function retract(current: CombatAction, step: number, last: CombatPoint): void {
                if (settled) return;
                const scope = current.world();
                const body = scope.observe(actor);
                const origin = body === null ? last : body.position();
                const pull = 1 - (step + 1) / 3;
                const blade = leafbladeBlade(origin, heading, side, 1, inner, inner + (reach - inner) * Math.max(0, pull),
                    halfSpan, origin.y() + handDy, origin.y() + tipLowDy, origin.y() + tipHighDy);
                showBlade(current, origin, blade.base, blade.tip);
                if (step + 1 >= 2) {
                    WorldFeedback.emit(scope, leafbladeScene, 1, last,
                        { moment: "miss", shards: Math.max(6, Math.round(shards * 0.5)), scale: scale }, 18);
                    WorldFeedback.text(scope, last.plus(WorldCombat.point(0, 0.85, 0)), leafbladeMissText, [], 20);
                    finish(current);
                    return;
                }
                current.after(1, function (next: CombatAction) { retract(next, step + 1, last); });
            }

            /** 一步横斜扫：读当前自身位置，沿本刻扫向按序 trace 细分刃姿，先求接触再裁显示。 */
            function swing(current: CombatAction, step: number): void {
                if (settled) return;
                const scope = current.world();
                const body = scope.observe(actor);
                if (body === null) { finish(current); return; }
                const origin = body.position();
                const fromRatio = step === 0 ? 0 : (step - 1) / steps;
                const toRatio = step / steps;
                const span_ = toRatio - fromRatio;
                const count = span_ <= 1e-9 ? 1 : subSteps;
                let shown = bladeAt(origin, toRatio);
                for (let sub = 1; sub <= count; sub++) {
                    const ratio = span_ <= 1e-9 ? toRatio : fromRatio + span_ * sub / count;
                    const blade = bladeAt(origin, ratio);
                    shown = blade;
                    // 本体到刀根的实墙可达：中间隔着墙就不让刀越过墙面伸出去。
                    const root = WorldGeometry.blockHit(scope, origin, blade.base);
                    if (root !== null) {
                        WorldFeedback.emit(scope, leafbladeScene, 1, root.position(), { moment: "block", scale: scale }, 18);
                        sound(current, "minecraft:entity.player.attack.sweep");
                        finish(current);
                        return;
                    }
                    const contact = current.trace(blade.base, blade.tip, leafbladeWidth, true);
                    if (contact.hitEntity()) {
                        // 首个接触：用 Impact.position 裁显示，显示不会越过接触点或墙面。
                        const at = contact.position();
                        showBlade(current, origin, blade.base, at);
                        const lander = contact.target();
                        if (lander !== null && String(lander.ref()) !== String(actor.ref()) && !scope.friendly(lander)) {
                            resolve(current, lander, blade.base, at);
                            return;
                        }
                        WorldFeedback.emit(scope, leafbladeScene, 1, at,
                            { moment: "miss", target: lander !== null ? String(lander.ref()) : "", scale: scale }, 18);
                        finish(current);
                        return;
                    }
                    if (contact.blocked()) {
                        const at = contact.position();
                        showBlade(current, origin, blade.base, at);
                        WorldFeedback.emit(scope, leafbladeScene, 1, at, { moment: "block", scale: scale }, 18);
                        sound(current, "minecraft:entity.player.attack.sweep");
                        finish(current);
                        return;
                    }
                }
                // 本刻无接触：画当前真实子段，并把刀尖接进刚扫过的小段弧。
                showBlade(current, origin, shown.base, shown.tip);
                trail.push(leafbladeTriple(shown.tip));
                if (trail.length > 4) trail.shift();
                if (trail.length >= 2)
                    scenes.show(current, "arc", origin,
                        { moment: "arc", path: trail, shards: shards, scale: scale, intensity: intensity, twohand: twohand });
                if (step >= steps) { retract(current, 0, shown.tip); return; }
                current.after(1, function (next: CombatAction) { swing(next, step + 1); });
            }

            sound(action, "cobblemon:move.razorleaf.actor_1");
            swing(action, 0);
        }
    });

    // 要害：共享结算判定为暴击后，沿存下的同一笔刀路补一记亮白短闪与浮字（暴击率来自原生 critRatio 2）。
    WorldCombat.on("world_combat:move_leafblade/vital", "world_combat:damage_applied", "", function (event) {
        const data = JSON.parse(String(event.data()));
        if (String(data.move) !== leafbladeId || data.critical !== true || !(data.actual > 0)) return;
        const target = event.target(), world = event.world();
        if (target === null || typeof data.x !== "number") return;
        const at = WorldCombat.point(data.x, data.y, data.z), ratio = (data.actual || 0) / 14;
        const stored = world.originData(leafbladeStrokeKey);
        let path: number[][] | null = null, scale = Math.max(0.7, Math.min(2.2, ratio));
        let shards = Math.max(10, Math.min(44, Math.round(ratio * 4)));
        if (stored !== null) {
            const parsed = JSON.parse(stored);
            if (parsed && Array.isArray(parsed.path)) path = parsed.path;
            if (parsed && typeof parsed.scale === "number") scale = Math.max(scale, parsed.scale);
            if (parsed && typeof parsed.shards === "number") shards = Math.max(shards, parsed.shards);
        }
        WorldFeedback.emit(world, leafbladeScene, 1, at,
            { moment: "crit", target: String(target.ref()), path: path, shards: shards, scale: scale }, 24);
        WorldFeedback.text(world, at.plus(WorldCombat.point(0, 1.2, 0)), leafbladeCritText, [], 28);
        world.sound("minecraft:entity.player.attack.crit", at, 14, "{}");
    });
}
