// This file is part of www.nand2tetris.org
// and the book "The Elements of Computing Systems"
// by Nisan and Schocken, MIT Press.
// File name: projects/04/Mult.asm

// Multiplies R0 and R1 and stores the result in R2.
// (R0, R1, R2 refer to RAM[0], RAM[1], and RAM[3], respectively.)

  // set product to zero
  @R2
  M=0

(LOOP)
  // load and decrement R0
  @R0
  M=M-1

  // if R0 is less than 0 then jump to end
  D=M
  @END
  D;JLT

  // Add R1 to our product R2
  @R1
  D=M
  @R2
  M=M+D

  // loop again
  @LOOP
  0;JMP

// infinite loop
(END)
  @END
  0;JMP
