// 戏法空间的可执行设计说明：一片双方平等生效的歪斜空间，把移动速度倒转。
// 必然事实：施法者放出空间并带上共享身份；被罩住的普通生物原生移动速度可观察地被倒转，离场后恢复；
// 最低倍率越小扭得越狠；几何上盖住但视线被墙挡住的区域不接管规则；退出重叠空间的一片时会切换到
// 仍在覆盖的那片规则，全部退出才恢复。
Smoke.scenario("trickroom", function (stage) {
    stage.weather("clear");
    stage.time("day");

    const MOVEMENT = "minecraft:generic.movement_speed";
    const STATUS = "world_combat:status/trickroom";
    const FIELD = PokemonSkills.trickRoomField;
    // 正收益施放：身边有慢队友、近处是快威胁，选点净收益为正才会出手。
    const caster = stage.pokemon({ species: "abra", level: 34, moves: ["trickroom"], at: [-3, 0, 0] });
    const mateA = stage.mob({ type: "minecraft:cow", at: [-4, 0, 1] });
    const mateB = stage.mob({ type: "minecraft:cow", at: [-2, 0, -2] });
    const foe = stage.mob({ type: "minecraft:cow", at: [5, 0, 0] });
    stage.team("trickroom_home", [caster, mateA, mateB]);
    stage.hostile(caster, foe);
    stage.noai(foe);
    // 负收益情形：第二施法者身边只有快步队友、威胁很慢，扭转会净拖累队伍，应拒绝。
    const cautious = stage.pokemon({ species: "abra", level: 34, moves: ["trickroom"], at: [-14, 0, 30] });
    const runnerA = stage.mob({ type: "minecraft:cow", at: [-15, 0, 28] });
    const runnerB = stage.mob({ type: "minecraft:cow", at: [-13, 0, 28] });
    const runnerC = stage.mob({ type: "minecraft:cow", at: [-14, 0, 26] });
    const crawler = stage.mob({ type: "minecraft:cow", at: [-12, 0, 32] });
    stage.team("trickroom_swift", [cautious, runnerA, runnerB, runnerC]);
    stage.hostile(cautious, crawler);
    stage.noai(runnerA); stage.noai(runnerB); stage.noai(runnerC); stage.noai(crawler);
    stage.command("attribute " + runnerA.ref.split("/")[0] + " " + MOVEMENT + " base set 0.30");
    stage.command("attribute " + runnerB.ref.split("/")[0] + " " + MOVEMENT + " base set 0.30");
    stage.command("attribute " + runnerC.ref.split("/")[0] + " " + MOVEMENT + " base set 0.30");
    stage.command("attribute " + crawler.ref.split("/")[0] + " " + MOVEMENT + " base set 0.05");
    stage.command("attribute " + mateA.ref.split("/")[0] + " " + MOVEMENT + " base set 0.05");
    stage.command("attribute " + mateB.ref.split("/")[0] + " " + MOVEMENT + " base set 0.05");

    // 几具静止的普通生物，先给出明确的原生移动速度，供倒转与恢复判读。
    const fast = stage.mob({ type: "minecraft:zombie", at: [24, 0, 0] });
    const slow = stage.mob({ type: "minecraft:cow", at: [24, 0, 4] });
    const walled = stage.mob({ type: "minecraft:cow", at: [30, 0, 0] });
    const walker = stage.mob({ type: "minecraft:pig", at: [30, 0, 4] });
    stage.noai(fast); stage.noai(slow); stage.noai(walled); stage.noai(walker);
    const fastUuid = fast.ref.split("/")[0], slowUuid = slow.ref.split("/")[0];
    const walledUuid = walled.ref.split("/")[0], walkerUuid = walker.ref.split("/")[0];
    stage.command("attribute " + fastUuid + " " + MOVEMENT + " base set 0.30");
    stage.command("attribute " + slowUuid + " " + MOVEMENT + " base set 0.12");
    stage.command("attribute " + walledUuid + " " + MOVEMENT + " base set 0.12");
    stage.command("attribute " + walkerUuid + " " + MOVEMENT + " base set 0.12");
    const fastBase = stage.attribute(fast, MOVEMENT), slowBase = stage.attribute(slow, MOVEMENT);
    const walledBase = stage.attribute(walled, MOVEMENT), walkerBase = stage.attribute(walker, MOVEMENT);
    const seen: any = { fastBase: round(fastBase), slowBase: round(slowBase) };

    function round(value: number): number { return Math.round(value * 1000) / 1000; }
    function speed(actor: Smoke.Actor): number { return stage.attribute(actor, MOVEMENT); }
    function tp(actor: Smoke.Actor, x: number, z: number): void {
        stage.command("tp " + actor.ref.split("/")[0] + " ~" + x + " ~ ~" + z);
    }
    function waitMember(actors: Smoke.Actor[], next: () => void, label: string): void {
        stage.until(140, function () {
            for (let i = 0; i < actors.length; i++) if (!stage.hasMobEffect(actors[i], STATUS)) return false;
            return true;
        }, next, label);
    }
    function waitRestored(actors: Smoke.Actor[], bases: number[], next: () => void, label: string): void {
        stage.until(140, function () {
            for (let i = 0; i < actors.length; i++) if (Math.abs(speed(actors[i]) - bases[i]) > 0.02) return false;
            return true;
        }, next, label);
    }
    function waitGone(actors: Smoke.Actor[], next: () => void, label: string): void {
        stage.until(140, function () {
            for (let i = 0; i < actors.length; i++) if (stage.hasMobEffect(actors[i], STATUS)) return false;
            return true;
        }, next, label);
    }

    stage.until(900, function () {
        return stage.casts("trickroom", caster) > 0 && stage.hadMobEffect(caster, STATUS);
    }, function () {
        stage.expect(stage.casts("trickroom", caster) > 0, "trickroom was cast");
        stage.expect(stage.hadMobEffect(caster, STATUS), "the caster standing inside carried the shared trickroom identity");
        stage.expect(fastBase > slowBase, "the staged vanilla bodies start with different native movement speeds");

        // 主空间：落点确定，验证普通生物原生移动速度真的被倒转、离场恢复。
        stage.field(FIELD, [0, 0, 14], 600, 5, { reference: 0.23, depth: 0.4, density: 24 }, caster);
        tp(fast, 0, 14); tp(slow, 0, 15);
        waitMember([fast, slow], function () {
            stage.until(80, function () {
                return speed(fast) < fastBase - 0.005 && speed(slow) > slowBase + 0.005;
            }, function () {
                seen.fastInside = round(speed(fast)); seen.slowInside = round(speed(slow));
                stage.expect(seen.fastInside < seen.slowInside, "inside the space the slower body outruns the faster one");
                tp(fast, 0, 40); tp(slow, 0, 44);
                waitRestored([fast, slow], [fastBase, slowBase], function () {
                    waitGone([fast, slow], function () {
                        stage.expect(Math.abs(speed(fast) - fastBase) < 0.02 && Math.abs(speed(slow) - slowBase) < 0.02,
                            "the bodies regained their native movement speeds after leaving");
                        strength();
                    }, "both bodies released their memberships");
                }, "both bodies left the space and their speed returned");
            }, "the twist reached both staged bodies");
        }, "both staged bodies entered the space");
    }, "the twisted space holds");

    function strength(): void {
        // 最低倍率越小扭得越狠：同一具慢体在 0.35 与 0.75 两片空间里的实际速度对比。
        stage.field(FIELD, [0, 0, 26], 600, 4, { reference: 0.23, depth: 0.35, density: 20 }, caster);
        stage.field(FIELD, [0, 0, 36], 600, 4, { reference: 0.23, depth: 0.75, density: 20 }, caster);
        tp(slow, 0, 26);
        waitMember([slow], function () {
            stage.until(80, function () { return speed(slow) > slowBase + 0.05; }, function () {
                seen.strongSpeed = round(speed(slow));
                tp(slow, 0, 36);
                // 期望：base 0.12 经最低倍率 0.75 夹到 1/0.75 倍 → 0.16。
                stage.until(100, function () {
                    return stage.hasMobEffect(slow, STATUS) && Math.abs(speed(slow) - 0.16) < 0.02;
                }, function () {
                    seen.weakSpeed = round(speed(slow));
                    stage.expect(seen.strongSpeed > seen.weakSpeed + 0.05, "a lower minimum multiplier twists the body harder");
                    stage.expect(seen.weakSpeed > slowBase + 0.02, "the weaker minimum multiplier still twists, just less");
                    tp(slow, 0, 44);
                    waitRestored([slow], [slowBase], function () {
                        stage.expect(Math.abs(speed(slow) - slowBase) < 0.02, "the body restored to its current true speed after both spaces");
                        wall();
                    }, "the body left both strength spaces");
                }, "the weaker minimum multiplier settled on the slow body");
            }, "the strong minimum multiplier pushed the slow body up");
        }, "the slow body entered the strong space");
    }

    function wall(): void {
        // 一块墙柱立在一片几何覆盖、但视线被挡的空间与该成员之间；被挡的空间不得接管有效规则。
        stage.block([12, 0, 15], "minecraft:stone");
        stage.block([12, 1, 15], "minecraft:stone");
        stage.block([12, 2, 15], "minecraft:stone");
        stage.field(FIELD, [12, 0, 10], 600, 5, { reference: 0.23, depth: 0.4, density: 20 }, caster);   // 有效，4 格外
        stage.field(FIELD, [12, 0, 16], 600, 5, { reference: 0.23, depth: 0.75, density: 20 }, caster);  // 更近，但被墙挡住
        tp(walled, 12, 14);
        waitMember([walled], function () {
            stage.until(80, function () { return speed(walled) > walledBase + 0.05; }, function () {
                seen.wallSpeed = round(speed(walled));
                // 有效空间最低倍率 0.4：慢体应被推到约 0.30；若被墙后的 0.75 接管则会停在约 0.16。
                stage.expect(seen.wallSpeed > 0.25, "the near space behind the wall did not take over the valid space");
                tp(walled, 30, 14);
                waitRestored([walled], [walledBase], function () {
                    waitGone([walled], function () {
                        stage.expect(Math.abs(speed(walled) - walledBase) < 0.02, "the walled body restored to its current true speed");
                        overlap();
                    }, "the walled body released its membership");
                }, "the walled body left the space and its speed returned");
            }, "the valid space twisted the walled body");
        }, "the walled body entered the valid space");
    }

    function overlap(): void {
        // 两片重叠但最低倍率不同：起点离低倍率那片更近；移动到只剩另一片覆盖时，速度切换到那片的规则，
        // 全部退出才恢复。OV2（18,32，最低 0.4）更近；OV1（18,23，最低 0.75）更远。
        stage.field(FIELD, [18, 0, 23], 600, 5, { reference: 0.23, depth: 0.75, density: 20 }, caster);
        stage.field(FIELD, [18, 0, 32], 600, 5, { reference: 0.23, depth: 0.4, density: 20 }, caster);
        tp(walker, 18, 28);
        waitMember([walker], function () {
            stage.until(80, function () { return speed(walker) > walkerBase + 0.05; }, function () {
                seen.overlapStart = round(speed(walker));
                tp(walker, 18, 20);  // 只在低倍率 0.75 的第一片里
                // 期望：base 0.12 经最低倍率 0.75 夹到 1/0.75 倍 → 0.16，且仍带成员身份。
                stage.until(100, function () {
                    return stage.hasMobEffect(walker, STATUS) && Math.abs(speed(walker) - 0.16) < 0.02;
                }, function () {
                    seen.overlapSwitch = round(speed(walker));
                    stage.expect(stage.hasMobEffect(walker, STATUS), "leaving one overlapping space kept the other's membership");
                    stage.expect(seen.overlapSwitch < seen.overlapStart - 0.05, "the remaining overlapping space governed the current true speed");
                    stage.expect(seen.overlapSwitch > walkerBase + 0.02, "the remaining overlapping space still twisted the walker");
                    tp(walker, 18, 16);
                    waitRestored([walker], [walkerBase], function () {
                        waitGone([walker], function () {
                            stage.expect(Math.abs(speed(walker) - walkerBase) < 0.02, "the walker restored to its current true speed");
                            // 有界负收益测试：明显拖累队伍的局面给足决策时间也不该出手。
                            stage.after(90, function () {
                                stage.expect(stage.casts("trickroom", cautious) === 0, "a clearly negative payoff was declined");
                                stage.note("普通生物的原生移动速度在空间内被倒转、离场恢复；最低倍率越低扭得越狠；墙后没有贡献的空间不接管规则；重叠空间只退出其中一片时速度切换到仍在覆盖的规则；净收益为负时不施放。", seen);
                                stage.done();
                            });
                        }, "the walker released its membership");
                    }, "the walker left every space and its speed returned");
                }, "the walker moved to the space with the higher minimum multiplier");
            }, "the walker speed rose in the nearer overlap space");
        }, "the walker entered the overlapping spaces");
    }
});
