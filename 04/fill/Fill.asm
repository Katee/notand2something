// This file is part of www.nand2tetris.org
// and the book "The Elements of Computing Systems"
// by Nisan and Schocken, MIT Press.
// File name: projects/04/Fill.asm

// Runs an infinite loop that listens to the keyboard input.
// When a key is pressed (any key), the program blackens the screen,
// i.e. writes "black" in every pixel. When no key is pressed, the
// program clears the screen, i.e. writes "white" in every pixel.

(RESTARTSCREEN)
  @SCREEN // get starting address for screen
  D=A // put it somewhere
  @currentPixels
  M=D // store the screen address in currentPixels

  // check if a key has been pressed
  @KBD
  D=M
  @BLACK
  D;JNE // it has! make the screen black

// set current color to zero (all bits off)
(WHITE)
  @R0
  D=A
  @CURRENTCOLOR
  0;JMP

// set current color to -1 (all bits on)
(BLACK)
  @R0
  D=A-1

(CURRENTCOLOR)
  @currentColor
  M=D

(LOOP)
  // load the current color
  @currentColor
  D=M

  @currentPixels
  A=M
  M=D // turn on the pixel

  // increment our video memory pointer address
  @currentPixels
  M=M+1
  D=M

  // if we have reached the end of the screen
  @KBD // the keyboards starts at the end of the screen
  D=D-A
  @RESTARTSCREEN
  D;JGE

  @LOOP
  0;JMP

(END) // infinite loop
  @END
  0;JMP
