// This file is part of www.nand2tetris.org
// and the book "The Elements of Computing Systems"
// by Nisan and Schocken, MIT Press.
// File name: projects/04/Mult.asm

// Multiplies R0 and R1 and stores the result in R2.
// (R0, R1, R2 refer to RAM[0], RAM[1], and RAM[3], respectively.)

  @2
  M=0 // set product to zero
(LOOP)
  @0
  M=M-1 // load and decrement R0

  D=M
  @END
  D;JLT // if R0 is less than 0 we are done

  @1 // load R1
  D=M // save
  @2 // load R2
  M=M+D // add to our product

  @LOOP
  0;JMP
(END) // infinite loop
  @END
  0;JMP
