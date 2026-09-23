/**
 * 交换场地 / allyswitch —— 执行组织。
 *
 * 核心念头：用念力把我和同伴在同一瞬间对调位置——两处各留一小段错位残影；更关键的是，原本盯着我或盯着同伴的敌人，
 *   会跟着把目标对调：打向我的那一下，换位后落到换上来的同伴身上。瞬发、不留东西、不给等级，是一次位移加误导。
 *
 * 两幕：
 *   折（windup 播「折空」，提交前只观察与预告，打断不花代价）。
 *   换（提交后）：先记下 sweep 内盯着两人的敌人，再用 world.swap 把两人对调，最后把这些敌人的目标对调到另一人身上；
 *     两处原地各留一段残影（表现 keep，不改世界）。
 * 结束：换位与误导在提交后一次完成，随动作结束清理残影。
 * 反制：换位改变的是谁站在哪、谁被谁盯；已经飞在半空的投射物仍按落点结算，可以被走位或无敌帧躲开。
 */
namespace PokemonSkills {
    define({
        id: allySwitchId,
        cooldownParameter: "wait",
        name: "交换场地",
        description: "用念力瞬间与身边的同伴对调位置，并让原本盯着我或盯着同伴的敌人把目标跟着对调；瞬发、不留东西。只能对射程内的同伴使用。",
        uses: ["被贴住时与同伴对调，把这一下引到别人身上", "把残血的自己换到同伴背后", "打断正盯着我的敌人的节奏"],
        kind: "friend",
        range: 6,
        maxRange: 11,
        prepare: 4,
        active: 1,
        recover: 5,
        cooldown: 70,
        style: "shift",
        stationary: false,
        defaults: { tandem: false, ai: { maxChase: 14, retreatBelow: 0.4 } },
        fields: [flag("tandem", "同调")],
        indicator: function (config, pokemon) {
            return { radius: pokemon ? p(allySwitchId, "swapRange", pokemon) : 6, geometry: "area", style: "shift",
                color: 0x7FD8FF, label: config && config.tandem === true ? "交换场地 · 同调" : "交换场地" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills[allySwitchId], detail: { values: config }, world: world || null, actor: actor || null, attributes };
            return {
                prepare: Math.round(p(allySwitchId, "tempo", context)),
                recover: Math.round(p(allySwitchId, "aftercast", context)),
                cooldown: Math.round(p(allySwitchId, "wait", context)),
                active: 1,
                range: p(allySwitchId, "swapRange", context)
            };
        },
        ready: function (action, _config) {
            const target = action.target();
            if (target === null) return "invalid-target";
            if (String(target.ref()) === String(action.actor().ref())) return "no-partner";
            if (!action.sense().friendly(target)) return "invalid-target";
            return "";
        },
        windup: function (action, config, prepare) {
            action.present("world_combat:move_allyswitch:fold", allySwitchScene, 1, action.origin(),
                JSON.stringify({ moment: "fold", tandem: config && config.tandem === true ? 1 : 0 }));
            return prepare;
        },
        execute: function (action, _move, config, done) {
            const world = action.world(), self = action.actor(), ally = action.target();
            if (ally === null || !world.valid(ally) || !world.friendly(ally) || String(ally.ref()) === String(self.ref())) { done(action); return; }
            const selfBody = world.observe(self), allyBody = world.observe(ally);
            if (selfBody === null || allyBody === null) { done(action); return; }
            const selfFrom = selfBody.position(), allyFrom = allyBody.position();
            const motes = Math.max(8, Math.round(p(allySwitchId, "motes", action)));
            const sweep = Math.max(1, p(allySwitchId, "sweep", action));
            const blink = Math.max(20, Math.round(p(allySwitchId, "blink", action)));
            const scale = Math.max(0.6, Math.min(1.8, motes / 24));
            const selfRef = String(self.ref()), allyRef = String(ally.ref());
            const center = selfFrom.plus(allyFrom).scale(0.5);

            // 换位前先记下盯着两人的敌人；换位后再把这些目标对调。
            const near = world.query(center, sweep, false);
            const chasingSelf: CombatActor[] = [], chasingAlly: CombatActor[] = [];
            for (let index = 0; index < near.length; index++) {
                const other = near[index];
                if (world.friendly(other)) continue;
                const facts = world.observe(other);
                if (facts === null || facts.health() <= 0) continue;
                const chasing = facts.attacking();
                if (chasing === null) continue;
                const ref = String(chasing.ref());
                if (ref === selfRef) chasingSelf.push(other);
                else if (ref === allyRef) chasingAlly.push(other);
            }

            const swapped = world.swap(self, ally);
            let misled = 0;
            if (swapped) {
                for (let index = 0; index < chasingSelf.length; index++) {
                    const other = chasingSelf[index];
                    if (world.valid(other) && world.valid(ally) && world.target(other, ally)) misled++;
                }
                for (let index = 0; index < chasingAlly.length; index++) {
                    const other = chasingAlly[index];
                    if (world.valid(other) && world.valid(self) && world.target(other, self)) misled++;
                }
            }

            WorldFeedback.emit(world, allySwitchScene, 1, center,
                { moment: "swap", path: [[selfFrom.x(), selfFrom.y(), selfFrom.z()], [allyFrom.x(), allyFrom.y(), allyFrom.z()]],
                    target: allyRef, motes: motes, misled: misled,
                    swapped: swapped ? 1 : 0, scale: scale, intensity: Math.max(0.7, Math.min(1.8, 0.7 + misled / 3)) }, 26);
            const ghostTicks = Math.min(blink, 200);
            WorldFeedback.keep(world, "world_combat:move_allyswitch/ghost/self", allySwitchScene, 1, selfFrom,
                { moment: "ghost", target: selfRef, motes: motes, scale: scale }, ghostTicks);
            WorldFeedback.keep(world, "world_combat:move_allyswitch/ghost/ally", allySwitchScene, 1, allyFrom,
                { moment: "ghost", target: allyRef, motes: motes, scale: scale }, ghostTicks);
            WorldFeedback.text(world, center.plus(WorldCombat.point(0, 1.25, 0)),
                swapped ? allySwitchSwapText : allySwitchFizzleText, swapped ? [misled] : [], 28);
            world.sound("minecraft:entity.illusioner.mirror_move", selfFrom, 14, "{}");
            world.sound("minecraft:entity.enderman.teleport", center, 14, "{}");
            done(action);
        }
    });
}
